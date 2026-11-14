import type { NextRequest } from "next/server";

// Client IP for rate limiting. Forwarding headers are only as trustworthy as
// the proxy that sets them, so none is believed by default:
//   - On Vercel (VERCEL=1) x-vercel-forwarded-for is set by the edge and
//     can't be spoofed by the client.
//   - Self-hosted behind your own proxy, set TRUSTED_IP_HEADER to the header
//     that proxy overwrites (e.g. "x-real-ip", "cf-connecting-ip"). For
//     "x-forwarded-for" the LAST entry is used — the one your proxy appended.
//   - Otherwise every client shares one "unknown" bucket: limits stay
//     enforced (fail closed) instead of being reset by a forged header.
let warned = false;

export function clientIpFromHeaders(headers: Headers): string {
  if (process.env.VERCEL === "1") {
    const v = headers.get("x-vercel-forwarded-for");
    if (v) return v.split(",")[0].trim();
  }

  const name = process.env.TRUSTED_IP_HEADER?.trim().toLowerCase();
  if (name) {
    const raw = headers.get(name);
    if (raw) {
      const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
      const ip = name === "x-forwarded-for" ? parts.at(-1) : parts[0];
      if (ip) return ip.slice(0, 64);
    }
  }

  if (process.env.NODE_ENV === "production" && !warned) {
    warned = true;
    console.warn(
      "[ip] no trusted client-IP source (not on Vercel, TRUSTED_IP_HEADER unset) — all clients share one rate-limit bucket"
    );
  }
  return "unknown";
}

export function clientIp(req: NextRequest): string {
  return clientIpFromHeaders(req.headers);
}
