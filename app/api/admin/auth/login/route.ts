import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db, withDbRetry } from "@/lib/db";
import { isAllowedOrigin } from "@/lib/auth/csrf";
import { clientIp } from "@/lib/auth/ip";
import { loginAdmin } from "@/lib/auth/login";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookies";

const bodySchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(200),
});

const NO_STORE = { "Cache-Control": "no-store" };
const GENERIC_ERROR = "Invalid email or password";

export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403, headers: NO_STORE }
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: GENERIC_ERROR },
      { status: 400, headers: NO_STORE }
    );
  }

  const result = await withDbRetry(() =>
    loginAdmin(db, {
      email: body.email,
      password: body.password,
      ip: clientIp(req),
    })
  );

  if (!result.ok) {
    if (result.throttled) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        {
          status: 429,
          headers: {
            ...NO_STORE,
            "Retry-After": String(result.retryAfterSec),
          },
        }
      );
    }
    return NextResponse.json(
      { error: GENERIC_ERROR },
      { status: 401, headers: NO_STORE }
    );
  }

  const res = NextResponse.json({ ok: true }, { headers: NO_STORE });
  res.cookies.set(
    SESSION_COOKIE,
    result.token,
    sessionCookieOptions(result.expiresAt)
  );
  return res;
}
