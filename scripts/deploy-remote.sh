#!/usr/bin/env bash
# Runs ON the VPS as the deploy user (invoked via `ssh ... 'bash -s'`
# from the GitHub Actions deploy workflow). Receives the uploaded release
# tarball path as $1.
#
# Layout it maintains:
#   /var/www/groovveeaifest/
#     .env                  <- production secrets, never touched by deploys
#     releases/<timestamp>/ <- extracted standalone builds
#     current -> releases/X <- atomic symlink; PM2 runs current/server.js
#
# PM2: the existing daemon runs as root and all PM2 apps are managed by
# root, so deploys authenticate as root (DO_USER=root). The preflight
# verifies we are talking to an EXISTING daemon for this user — it never
# spawns a second daemon and never touches other PM2 apps.
set -euo pipefail

APP_DIR="/var/www/groovveeaifest"
APP_NAME="groovveeaifest"
PORT="3003"
HOSTNAME="127.0.0.1"
KEEP_RELEASES=5

# Require exactly one argument: the uploaded release tarball.
if [ "$#" -ne 1 ] || [ -z "${1:-}" ]; then
  echo "ERROR: usage: deploy-remote.sh <release-tarball-path>" >&2
  exit 1
fi
TARBALL="$1"
if [ ! -f "$TARBALL" ]; then
  echo "ERROR: release tarball not found: $TARBALL" >&2
  exit 1
fi

DEPLOY_USER="$(id -un)"
PM2_HOME="${PM2_HOME:-$HOME/.pm2}"
RELEASE="$APP_DIR/releases/$(date +%Y%m%d%H%M%S)"
PREVIOUS=""

# Restore the previous release symlink and restart the app on it.
# The previous release directory is never deleted here — it stays
# available even if the rollback restart itself fails.
rollback() {
  echo ">> ROLLBACK: restoring previous release" >&2
  if [ -n "$PREVIOUS" ] && [ -d "$PREVIOUS" ]; then
    ln -sfn "$PREVIOUS" "$APP_DIR/current.new"
    mv -Tf "$APP_DIR/current.new" "$APP_DIR/current"
    if pm2 restart "$APP_NAME" --update-env; then
      echo ">> Rollback complete: current -> $PREVIOUS"
    else
      echo ">> ERROR: rollback restart failed — app may be DOWN. Manual intervention required." >&2
    fi
  else
    echo ">> ERROR: no previous release to roll back to — site may be DOWN. Manual intervention required." >&2
  fi
}

# --------------------------------------------------------------------------
# Preflight: prove we're talking to the EXISTING PM2 daemon for this user
# before switching anything.
# --------------------------------------------------------------------------
echo ">> Preflight: verifying PM2 daemon for user '$DEPLOY_USER'"

# pub.sock exists only while a daemon was started for this user. If it's
# absent, `pm2` would silently spawn a SECOND daemon — refuse instead.
if [ ! -S "$PM2_HOME/pub.sock" ]; then
  echo "ERROR: no PM2 daemon socket at $PM2_HOME/pub.sock for user '$DEPLOY_USER'." >&2
  echo "       Refusing to spawn a new PM2 daemon. Deploy as the PM2 owner (root)." >&2
  exit 1
fi

if ! pm2 ping >/dev/null 2>&1; then
  echo "ERROR: PM2 socket exists at $PM2_HOME/pub.sock but the daemon is unreachable." >&2
  exit 1
fi

# If the app already exists under this daemon, verify it's ours before
# changing it: correct owner and a script path inside this app directory.
# `pm2 jlist` must succeed AND parse as JSON — a broken inspection must fail
# the deploy, never masquerade as a "first deployment".
if ! PM2_JLIST="$(pm2 jlist 2>/dev/null)"; then
  echo "ERROR: 'pm2 jlist' failed — daemon unreachable or unreadable." >&2
  exit 1
fi

if ! APP_INFO="$(APP_NAME="$APP_NAME" PM2_JLIST="$PM2_JLIST" node -e '
  const a = JSON.parse(process.env.PM2_JLIST)
    .find(p => p.name === process.env.APP_NAME);
  if (a) console.log([a.pm2_env.username || "", a.pm2_env.pm_exec_path || ""].join(" "));
' 2>/dev/null)"; then
  echo "ERROR: could not parse 'pm2 jlist' output — refusing to guess deployment state." >&2
  exit 1
fi

# Only here — a valid, parsed process list with no match — is it a first deploy.
APP_EXISTS=0
if [ -n "$APP_INFO" ]; then
  APP_EXISTS=1
  APP_USER="${APP_INFO%% *}"
  APP_PATH="${APP_INFO#* }"
  if [ "$APP_USER" != "$DEPLOY_USER" ]; then
    echo "ERROR: PM2 app '$APP_NAME' is managed by user '$APP_USER', not '$DEPLOY_USER'." >&2
    echo "       Refusing to modify another user's application." >&2
    exit 1
  fi
  case "$APP_PATH" in
    "$APP_DIR"/*) ;;
    *)
      echo "ERROR: PM2 app '$APP_NAME' runs '$APP_PATH', which is outside $APP_DIR." >&2
      echo "       Refusing to modify an application that isn't this deployment." >&2
      exit 1
      ;;
  esac
  echo ">> Preflight OK: '$APP_NAME' owned by '$APP_USER', script $APP_PATH"
else
  echo ">> Preflight OK: '$APP_NAME' not registered yet — first deploy under the existing daemon."
fi

# --------------------------------------------------------------------------
# Extract the new release
# --------------------------------------------------------------------------
echo ">> Extracting release to $RELEASE"
mkdir -p "$RELEASE"
tar -xzf "$TARBALL" -C "$RELEASE"
rm -f "$TARBALL"

# Production env file lives outside releases — link it in, never copy.
if [ ! -f "$APP_DIR/.env" ]; then
  echo "ERROR: $APP_DIR/.env is missing on the VPS." >&2
  exit 1
fi
ln -sfn "$APP_DIR/.env" "$RELEASE/.env"

PREVIOUS="$(readlink -f "$APP_DIR/current" || true)"

echo ">> Switching current -> $RELEASE"
ln -sfn "$RELEASE" "$APP_DIR/current.new"
mv -Tf "$APP_DIR/current.new" "$APP_DIR/current"

export NODE_ENV=production PORT="$PORT" HOSTNAME="$HOSTNAME"

# PM2 points at the *stable* current/server.js path: a restart resolves the
# symlink fresh and picks up the new release. If PM2 itself fails after the
# switch, roll the symlink back and restart the previous release.
if [ "$APP_EXISTS" = "1" ]; then
  echo ">> Restarting existing PM2 app '$APP_NAME'"
  if ! pm2 restart "$APP_NAME" --update-env; then
    echo ">> ERROR: pm2 restart failed after symlink switch." >&2
    rollback
    exit 1
  fi
else
  echo ">> Starting PM2 app '$APP_NAME' (first deploy)"
  if ! pm2 start "$APP_DIR/current/server.js" --name "$APP_NAME" --cwd "$APP_DIR/current"; then
    echo ">> ERROR: pm2 start failed." >&2
    rollback
    exit 1
  fi
fi

# --------------------------------------------------------------------------
# Health check — rollback on failure
# --------------------------------------------------------------------------
echo ">> Health check http://$HOSTNAME:$PORT/"
if curl -fsS --retry 20 --retry-delay 3 --retry-all-errors \
    "http://$HOSTNAME:$PORT/" -o /dev/null; then
  echo ">> Health check passed."
else
  echo ">> Health check FAILED." >&2
  rollback
  exit 1
fi

# Persist PM2 state only after a verified-good deploy — never save a
# failed or rolled-back state.
pm2 save

echo ">> Pruning old releases (keeping $KEEP_RELEASES)"
ls -1dt "$APP_DIR"/releases/*/ | tail -n "+$((KEEP_RELEASES + 1))" | xargs -r rm -rf --

echo ">> Deploy complete: $(readlink -f "$APP_DIR/current")"
