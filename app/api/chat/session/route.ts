import { NextRequest, NextResponse } from "next/server";

import { isAllowedOrigin } from "@/lib/auth/csrf";
import { issueFormToken } from "@/lib/form-token";

// Issues a signed session token the chat widget attaches to each message —
// proves the request came through the widget, not an arbitrary HTTP client.
export async function GET(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json(
    { token: issueFormToken() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
