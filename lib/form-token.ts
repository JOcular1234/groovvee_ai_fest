import { createHmac, randomBytes } from "crypto";

// Signing key for form tokens. FORM_SIGNING_SECRET is required in production
// so tokens stay valid across instances/restarts; development falls back to a
// per-process key (a restart simply invalidates in-flight tokens).
const DEV_KEY = randomBytes(32);

function signingKey(): Buffer | string {
  const secret = process.env.FORM_SIGNING_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("FORM_SIGNING_SECRET is not configured");
  }
  return DEV_KEY;
}

function sign(ts: number): string {
  return createHmac("sha256", signingKey())
    .update(String(ts))
    .digest("hex")
    .slice(0, 32);
}

// Token a public form renders at load time: "<timestamp>.<hmac>".
export function issueFormToken(): string {
  const ts = Date.now();
  return `${ts}.${sign(ts)}`;
}

// Minimum-fill-time deterrent. Returns true when the token is authentic,
// fresh enough, and the form took at least `minMs` to complete.
export function verifyFormToken(
  token: string,
  minMs = 4000,
  maxAgeMs = 60 * 60 * 1000
): boolean {
  const [tsRaw, sig] = token.split(".");
  const ts = Number(tsRaw);
  if (!Number.isFinite(ts) || !sig || sig !== sign(ts)) return false;
  const age = Date.now() - ts;
  return age >= minMs && age <= maxAgeMs;
}
