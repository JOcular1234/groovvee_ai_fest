import { z } from "zod";
import { normalizeEmail } from "@/lib/auth/password";
import { socialLinkSchema } from "@/lib/validation/speaker";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((u) => (u === "" ? null : u));

export const applicationSubmitSchema = z.object({
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
  organization: optionalText(160),
  talkTitle: optionalText(200),
  bio: z
    .string()
    .trim()
    .min(10, "Tell us a bit more (at least 10 characters)")
    .max(4000, "Bio is too long"),
  links: z.array(socialLinkSchema).max(8).default([]),
});

export type ApplicationSubmitInput = z.infer<typeof applicationSubmitSchema>;

export {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
} from "@/lib/application-status";

// Statuses an admin can move an application to.
export const reviewStatusSchema = z.enum(["REVIEWED", "ACCEPTED", "REJECTED"]);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const reviewNotesSchema = z
  .string()
  .trim()
  .max(2000, "Notes are too long");
