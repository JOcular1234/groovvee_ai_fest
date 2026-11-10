import { NextRequest, NextResponse } from "next/server";

import { db, withDbRetry } from "@/lib/db";
import { isAllowedOrigin } from "@/lib/auth/csrf";
import { SESSION_COOKIE } from "@/lib/auth/cookies";
import { revokeSessionByToken } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const headers = { "Cache-Control": "no-store" };

  if (!isAllowedOrigin(req)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403, headers }
    );
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) await withDbRetry(() => revokeSessionByToken(db, token));

  const res = NextResponse.json({ ok: true }, { headers });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
