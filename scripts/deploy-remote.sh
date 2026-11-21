#!/usr/bin/env bash
# Runs ON the VPS as the deploy user (invoked via `ssh ... 'bash -s'`
# from the GitHub Actions deploy workflow). Receives the uploaded release
# tarball path as the single argument.
#
# Layout it maintains:
#   /var/www/groovveeaifest/
#     .env                  <- production secrets, never touched by deploys
#     releases/<stamp>-<pid>/ <- extracted standalone builds
#     current -> releases/X <- atomic symlink; PM2 runs current/server.js
#
# PM2: the existing daemon runs as root (deploys authenticate as root).
# The preflight verifies we are talking to an EXISTING daemon for this
# user — it never spawns a second daemon and never touches other PM2 apps.
set -euo pipefail

APP_DIR="/var/www/groovveeaifest"
APP_NAME="groovveeaifest"
PORT="3003"
HOSTNAME="127.0.0.1"
KEEP_RELEASES=5

# Exactly one non-empty argument: the uploaded release tarball.
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
# $$ makes the dir unique even under overlapping deploys.
RELEASE="$APP_DIR/releases/$(date +%Y%m%d%H%M%S)-$$"
PREVIOUS=""
APP_EXISTS=0
APP_STARTED_BY_US=0

# Rollback for an EXISTING deployment: restore the previous symlink and
# restart on it. The previous release directory is never deleted here.
rollback_existing() {
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
    echo ">> ERROR: no previous release to roll back to — app may be DOWN. Manual intervention required." >&2
  fi
}

# Rollback for a FIRST deployment: there is nothing to restore, so undo
# what this deploy created — the `current` symlink and, only if this
# deploy actually started it, the PM2 process. Before deleting we
# re-inspect the live process and require its script path to be exactly
# the path this deploy registered — an app we didn't start is never
# deleted, even if it shares the name.
rollback_first() {
  echo ">> ROLLBACK: undoing first deployment" >&2
  rm -f "$APP_DIR/current.new" "$APP_DIR/current"

  if [ "$APP_STARTED_BY_US" != "1" ]; then
    echo ">> Rollback complete: removed current symlink (no PM2 process was started by this deploy)."
    return
  fi

  local live_path=""
  live_path="$(APP_NAME="$APP_NAME" python3 -c '
import json, os, sys
procs = json.load(sys.stdin)
a = next((p for p in procs if p.get("name") == os.environ["APP_NAME"]), None)
if a:
    print((a.get("pm2_env") or {}).get("pm_exec_path") or "")
' < <(pm2 jlist 2>/dev/null) 2>/dev/null || true)"

  if [ "$live_path" = "$APP_DIR/current/server.js" ] || \
     [ "$live_path" = "$RELEASE/server.js" ]; then
    if pm2 delete "$APP_NAME" >/dev/null 2>&1; then
      echo ">> Rollback complete: removed '$APP_NAME' PM2 process and current symlink."
    else
      echo ">> ERROR: could not delete '$APP_NAME' — manual intervention required." >&2
    fi
  else
    echo ">> WARNING: '$APP_NAME' script path '$live_path' does not match this deployment" >&2
    echo "       ($APP_DIR/current/server.js) — NOT deleting it. Inspect manually." >&2
  fi
}

rollback() {
  if [ "$APP_EXISTS" = "1" ]; then
    rollback_existing
  else
    rollback_first
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

# pm2.pid + kill -0 prove the daemon process is alive WITHOUT invoking
# `pm2`, which could auto-spawn a second daemon if the first were dead.
if [ ! -f "$PM2_HOME/pm2.pid" ]; then
  echo "ERROR: no $PM2_HOME/pm2.pid — cannot confirm a running daemon." >&2
  exit 1
fi
PM2_PID="$(cat "$PM2_HOME/pm2.pid")"
if ! kill -0 "$PM2_PID" 2>/dev/null; then
  echo "ERROR: PM2 daemon (pid $PM2_PID) is not running — refusing to let pm2 auto-spawn one." >&2
  exit 1
fi

# Daemon confirmed alive: ping it for responsiveness (cannot spawn — a
# live daemon already exists).
if ! pm2 ping >/dev/null 2>&1; then
  echo "ERROR: PM2 daemon (pid $PM2_PID) is not responding to 'pm2 ping'." >&2
  exit 1
fi

# `pm2 jlist` must succeed AND parse as JSON — a broken inspection fails
# the deploy, never masquerades as a "first deployment".
if ! PM2_JLIST="$(pm2 jlist 2>/dev/null)"; then
  echo "ERROR: 'pm2 jlist' failed — daemon unreachable or unreadable." >&2
  exit 1
fi

# Structured result: line 1 = "exists"/"absent", line 2 = script path.
# A process that exists but reports no script path fails closed — it is
# NEVER misread as a first deployment.
# python3 is used (always present on Ubuntu 24.04): `node` may not be on
# the SSH PATH even when PM2 is installed and working.
command -v python3 >/dev/null 2>&1 || {
  echo "ERROR: python3 not found — cannot parse 'pm2 jlist' output." >&2
  exit 1
}
if ! APP_STATE="$(APP_NAME="$APP_NAME" PM2_JLIST="$PM2_JLIST" python3 -c '
import json, os
procs = json.loads(os.environ["PM2_JLIST"])
a = next((p for p in procs if p.get("name") == os.environ["APP_NAME"]), None)
print("exists" if a else "absent")
print(((a.get("pm2_env") or {}).get("pm_exec_path") or "") if a else "")
' 2>/dev/null)"; then
  echo "ERROR: could not parse 'pm2 jlist' output — refusing to guess deployment state." >&2
  exit 1
fi

APP_STATUS="${APP_STATE%%$'\n'*}"
APP_PATH="${APP_STATE#*$'\n'}"

# Only a valid, parsed process list determines deployment state.
# Owner is already proven: the daemon lives in this user's $PM2_HOME and
# deploys run as that user, so anything in this list is managed by them.
case "$APP_STATUS" in
  exists)
    if [ -z "$APP_PATH" ]; then
      echo "ERROR: PM2 app '$APP_NAME' exists but reports no script path." >&2
      echo "       Failing closed — inspect it manually before deploying." >&2
      exit 1
    fi
    APP_EXISTS=1
    case "$APP_PATH" in
      "$APP_DIR"/*) ;;
      *)
        echo "ERROR: PM2 app '$APP_NAME' runs '$APP_PATH', which is outside $APP_DIR." >&2
        echo "       Refusing to modify an application that isn't this deployment." >&2
        exit 1
        ;;
    esac
    echo ">> Preflight OK: '$APP_NAME' exists, script $APP_PATH"
    ;;
  absent)
    echo ">> Preflight OK: '$APP_NAME' not registered — first deploy under the existing daemon."
    ;;
  *)
    echo "ERROR: unexpected PM2 inspection result '$APP_STATUS' — refusing to guess." >&2
    exit 1
    ;;
esac

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
# An archive must never carry its own .env over production secrets.
rm -f "$RELEASE/.env"
ln -sfn "$APP_DIR/.env" "$RELEASE/.env"

PREVIOUS="$(readlink -f "$APP_DIR/current" || true)"

echo ">> Switching current -> $RELEASE"
ln -sfn "$RELEASE" "$APP_DIR/current.new"
mv -Tf "$APP_DIR/current.new" "$APP_DIR/current"

export NODE_ENV=production PORT="$PORT" HOSTNAME="$HOSTNAME"

# PM2 points at the *stable* current/server.js path with cwd=current: a
# restart resolves the symlink fresh and picks up the new release. Any
# failure after the switch rolls back (or undoes) the deployment.
if [ "$APP_EXISTS" = "1" ]; then
  echo ">> Restarting existing PM2 app '$APP_NAME'"
  if ! pm2 restart "$APP_NAME" --update-env; then
    echo ">> ERROR: pm2 restart failed after symlink switch." >&2
    rollback
    exit 1
  fi
else
  echo ">> Starting PM2 app '$APP_NAME' (first deploy)"
  # Set before the attempt: if pm2 partially registers the process but
  # returns an error, rollback still inspects (and may delete) it.
  APP_STARTED_BY_US=1
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

# Prune old releases. The active release and the previous known-good one
# are always preserved — then at most KEEP_RELEASES releases total remain.
# NUL-delimited find + arrays handle paths safely, and an empty prune
# list is a normal no-op, never an error under set -euo pipefail.
echo ">> Pruning old releases (keeping $KEEP_RELEASES total)"
ACTIVE="$(readlink -f "$APP_DIR/current" || true)"

declare -a CANDIDATES=()
while IFS= read -r -d '' dir; do
  dir="${dir%/}"
  [ "$dir" = "$ACTIVE" ] && continue
  [ -n "$PREVIOUS" ] && [ "$dir" = "$PREVIOUS" ] && continue
  CANDIDATES+=("$dir")
done < <(find "$APP_DIR/releases" -mindepth 1 -maxdepth 1 -type d \
           -printf '%T@ %p\0' | sort -z -rn | cut -z -d' ' -f2-)

# Protected slots: active always; previous only if distinct.
PROTECTED=1
[ -n "$PREVIOUS" ] && [ "$PREVIOUS" != "$ACTIVE" ] && PROTECTED=2
KEEP_UNPROTECTED=$((KEEP_RELEASES - PROTECTED))
[ "$KEEP_UNPROTECTED" -lt 0 ] && KEEP_UNPROTECTED=0

if [ "${#CANDIDATES[@]}" -gt "$KEEP_UNPROTECTED" ]; then
  for old in "${CANDIDATES[@]:KEEP_UNPROTECTED}"; do
    echo ">>   removing $old"
    rm -rf -- "$old"
  done
fi

echo ">> Deploy complete: $ACTIVE"
