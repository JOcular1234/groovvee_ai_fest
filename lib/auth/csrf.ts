import type { NextRequest } from "next/server";

// CSRF gate for state-changing auth endpoints. SameSite=Lax is a baseline,
// not a complete strategy — cross-site POSTs must also fail an Origin check.
export function isAllowedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");

  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  // No Origin header: accept only same-origin or browser-initiated requests.
  const fetchSite = req.headers.get("sec-fetch-site");
  return fetchSite === "same-origin" || fetchSite === "none";
}
