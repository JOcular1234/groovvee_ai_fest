import { NextRequest, NextResponse } from "next/server";

import { db, withDbRetry } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth/cookies";
import { getAdminByToken } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const admin = token
    ? await withDbRetry(() => getAdminByToken(db, token))
    : null;

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  return NextResponse.json(
    {
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    },
    { headers }
  );
}
