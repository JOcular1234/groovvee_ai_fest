import "server-only";

import { headers } from "next/headers";

import { clientIpFromHeaders } from "@/lib/auth/ip";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { hashKey, hitLimit } from "@/lib/rate-limit";

// Abuse limits for public form submissions, applied after validation passes
// and just before anything is written or emailed:
//   - per-IP budget per form (scripted floods from one source)
//   - each signed form token accepted once (replaying a captured token)
// Both use the shared atomic DB limiter, so they hold across instances.

export type PublicForm = "contact" | "speaker" | "hack-wars" | "registration";

const PER_IP: Record<PublicForm, { max: number; windowMs: number }> = {
  contact: { max: 5, windowMs: 60 * 60 * 1000 },
  speaker: { max: 3, windowMs: 60 * 60 * 1000 },
  "hack-wars": { max: 3, windowMs: 60 * 60 * 1000 },
  registration: { max: 10, windowMs: 60 * 60 * 1000 },
};

// Tokens expire after an hour (lib/form-token.ts) — remember them as long.
const TOKEN_TTL_MS = 60 * 60 * 1000;

export type GuardResult = { ok: true } | { ok: false; message: string };

export async function guardPublicSubmission(
  db: PrismaClient,
  form: PublicForm,
  token: string
): Promise<GuardResult> {
  const ip = clientIpFromHeaders(await headers());

  const perIp = await hitLimit(db, hashKey(`form-ip|${form}`, ip), PER_IP[form]);
  if (!perIp.allowed) {
    return {
      ok: false,
      message: "Too many submissions from your network. Please try again later.",
    };
  }

  const once = await hitLimit(db, hashKey("form-token", token), {
    max: 1,
    windowMs: TOKEN_TTL_MS,
  });
  if (!once.allowed) {
    return {
      ok: false,
      message: "This form was already submitted — please reload the page to send another.",
    };
  }
  return { ok: true };
}
