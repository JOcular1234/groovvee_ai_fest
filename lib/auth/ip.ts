import type { NextRequest } from "next/server";

// On Vercel, x-vercel-forwarded-for is populated by the edge and cannot be
// spoofed by the client. x-real-ip is the fallback; both are ignored when
// absent (local development → loopback).
export function clientIp(req: NextRequest): string {
  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();

  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();

  return "127.0.0.1";
}
