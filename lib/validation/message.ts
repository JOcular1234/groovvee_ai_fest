import { z } from "zod";
import { normalizeEmail } from "@/lib/auth/password";
import { INQUIRY_TYPE_VALUES } from "@/lib/inquiry-types";

export const messageSubmitSchema = z.object({
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
  type: z.enum(INQUIRY_TYPE_VALUES),
  subject: z
    .string()
    .trim()
    .max(200, "Subject is too long")
    .transform((s) => (s === "" ? null : s)),
  message: z
    .string()
    .trim()
    .min(10, "Please write a bit more (at least 10 characters)")
    .max(5000, "Message is too long"),
});

export type MessageSubmitInput = z.infer<typeof messageSubmitSchema>;

import { MESSAGE_STATUS_VALUES } from "@/lib/message-status";

// Statuses an admin can move a message to — permissive by design.
export const messageStatusSchema = z.enum(MESSAGE_STATUS_VALUES);
export type MessageStatusValue = z.infer<typeof messageStatusSchema>;

export const messageNotesSchema = z
  .string()
  .trim()
  .max(2000, "Notes are too long");
