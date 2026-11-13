import { z } from "zod";

import { normalizeEmail } from "@/lib/auth/password";

// Public event registration — name + email + optional organization only.
// Email is normalized before storage so the (eventId, email) unique
// constraint dedupes case variants.
export const registrationSubmitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name is required")
    .max(120, "Name is too long"),
  email: z
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
    }),
  organization: z
    .string()
    .trim()
    .max(160, "Organization is too long")
    .transform((s) => (s === "" ? null : s)),
});

export type RegistrationSubmitInput = z.infer<typeof registrationSubmitSchema>;
