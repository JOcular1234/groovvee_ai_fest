import { createHmac, randomBytes } from "crypto";

// Per-process signing key. Forms are short-lived, so a rotating key is fine —
// a restart or a different instance simply invalidates in-flight tokens and
// the user re-submits. A stable env secret can replace this later.
const KEY = randomBytes(32);

function sign(ts: number): string {
  return createHmac("sha256", KEY).update(String(ts)).digest("hex").slice(0, 32);
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
