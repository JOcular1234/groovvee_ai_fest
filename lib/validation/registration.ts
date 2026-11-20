import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod";

import { normalizeEmail } from "@/lib/auth/password";

// Public event registration. Email is normalized before storage so the
// (eventId, email) unique constraint dedupes case variants.
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
  // Real-number validation via libphonenumber — the public form submits an
  // international "+1 …" value from the country-select widget.
  phone: z
    .string()
    .trim()
    .max(40)
    .refine(isValidPhoneNumber, "Enter a valid phone number"),
  school: z
    .string()
    .trim()
    .min(2, "School or institution is required")
    .max(160, "School name is too long"),
  city: z
    .string()
    .trim()
    .min(2, "City is required")
    .max(120, "City name is too long"),
  country: z
    .string()
    .trim()
    .min(2, "Country is required")
    .max(120, "Country name is too long"),
  organization: z
    .string()
    .trim()
    .max(160, "Organization is too long")
    .transform((s) => (s === "" ? null : s)),
});

export type RegistrationSubmitInput = z.infer<typeof registrationSubmitSchema>;
