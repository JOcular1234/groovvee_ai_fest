import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db, withDbRetry } from "@/lib/db";
import { isAllowedOrigin } from "@/lib/auth/csrf";
import { completeMfaLogin } from "@/lib/auth/login";
import { MFA_COOKIE } from "@/lib/auth/mfa";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookies";

const bodySchema = z.object({ code: z.string().trim().min(6).max(20) });
const NO_STORE = { "Cache-Control": "no-store" };

function clearChallenge(res: NextResponse) {
  res.cookies.set(MFA_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/admin/auth",
    maxAge: 0,
  });
  return res;
}

// Second login step. The challenge comes only from the httpOnly cookie set
// by the password step — never from the request body.
export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE });
  }

  const challenge = req.cookies.get(MFA_COOKIE)?.value;
  if (!challenge) {
    return NextResponse.json(
      { error: "Your sign-in expired. Enter your password again.", restart: true },
      { status: 401, headers: NO_STORE }
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid code" }, { status: 400, headers: NO_STORE });
  }

  const result = await withDbRetry(() =>
    completeMfaLogin(db, { challenge, code: body.code })
  );

  if (!result.ok) {
    if (result.expired) {
      return clearChallenge(
        NextResponse.json(
          { error: "Your sign-in expired. Enter your password again.", restart: true },
          { status: 401, headers: NO_STORE }
        )
      );
    }
    if (result.throttled) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        {
          status: 429,
          headers: { ...NO_STORE, "Retry-After": String(result.retryAfterSec) },
        }
      );
    }
    return NextResponse.json({ error: "Invalid code" }, { status: 401, headers: NO_STORE });
  }

  const res = NextResponse.json(
    { ok: true, usedRecoveryCode: result.usedRecoveryCode },
    { headers: NO_STORE }
  );
  res.cookies.set(SESSION_COOKIE, result.token, sessionCookieOptions(result.expiresAt));
  return clearChallenge(res);
}
