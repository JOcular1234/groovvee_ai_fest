import { z } from "zod";
import { normalizeEmail } from "@/lib/auth/password";

const emailField = z
  .string()
  .trim()
  .max(320)
  .transform((e, ctx) => {
    const normalized = normalizeEmail(e);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
      ctx.addIssue({ code: "custom", message: "Enter a valid email address" });
      return z.NEVER;
    }
    return normalized;
  });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((u) => (u === "" ? null : u));

const gradYearField = optionalText(10).transform((v, ctx) => {
  if (v === null) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 2000 || n > 2050) {
    ctx.addIssue({ code: "custom", message: "Enter a valid graduation year" });
    return z.NEVER;
  }
  return n;
});

export const memberSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Member name is required")
    .max(120, "Name is too long"),
  email: emailField,
  school: optionalText(160),
});

export const MAX_TEAM_MEMBERS = 3; // total, including the team leader

export const hackWarsApplySchema = z
  .object({
    participation: z.enum(["individual", "team"]),
    name: z
      .string()
      .trim()
      .min(2, "Full name is required")
      .max(120, "Name is too long"),
    email: emailField,
    phone: z
      .string()
      .trim()
      .regex(/^[+\d][\d\s()./-]{4,24}$/, "Enter a valid phone number")
      .transform((p) => p.replace(/\s+/g, " ").trim()),
    school: z
      .string()
      .trim()
      .min(2, "School or institution is required")
      .max(160, "School name is too long"),
    major: optionalText(160),
    gradYear: gradYearField,
    intro: z
      .string()
      .trim()
      .min(80, "Introduce yourself in a few sentences (at least 80 characters)")
      .max(1500, "Introduction is too long"),
    previousExperience: optionalText(2000),
    teamName: optionalText(80),
    members: z.array(memberSchema).max(2).default([]),
  })
  .superRefine((v, ctx) => {
    if (v.participation === "team") {
      if (!v.teamName) {
        ctx.addIssue({
          code: "custom",
          path: ["teamName"],
          message: "Team name is required",
        });
      }
      if (v.members.length < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["members"],
          message: "Add at least one team member (teams are 2-3 people)",
        });
      }
      if (v.members.some((m) => m.email === v.email)) {
        ctx.addIssue({
          code: "custom",
          path: ["members"],
          message: "Members must use a different email than the team leader",
        });
      }
    }
  })
  .transform((v) => ({
    ...v,
    isTeam: v.participation === "team",
    teamName: v.participation === "team" ? v.teamName : null,
    members: v.participation === "team" ? v.members : [],
  }));

export type HackWarsApplyInput = z.infer<typeof hackWarsApplySchema>;

// Admin review — same ApplicationStatus semantics as speaker applications.
export { reviewStatusSchema, reviewNotesSchema } from "./application";
export type { ReviewStatus } from "./application";
