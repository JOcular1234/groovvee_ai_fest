// Note: no __Host- prefix — browsers reject __Host- cookies without Secure,
// and Secure can't be set over plain http in local development. Path=/ with
// no Domain still prevents subdomain injection; Secure applies in production.
export const SESSION_COOKIE = "groovvee_admin_session";

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}
