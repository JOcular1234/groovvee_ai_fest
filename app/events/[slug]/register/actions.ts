"use server";

import { db, withDbRetry } from "@/lib/db";
import { verifyFormToken } from "@/lib/form-token";
import { registerForEvent } from "@/lib/registrations";
import { registrationSubmitSchema } from "@/lib/validation/registration";

export type RegisterFormState = {
  ok: boolean;
  done?: boolean;
  // Set when the email is already on the list — shown as a positive state,
  // not an error.
  duplicate?: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function submitRegistrationAction(
  eventSlug: string,
  _prev: RegisterFormState,
  formData: FormData
): Promise<RegisterFormState> {
  // Honeypot: real users never see or fill this field (see contact action).
  if (String(formData.get("gvf_extra") ?? "") !== "") {
    console.warn("[register] honeypot triggered — fake success returned");
    return { ok: true, done: true }; // pretend success — waste the bot's time
  }
  // Minimum-fill-time token (HMAC-signed; see lib/form-token.ts).
  if (!verifyFormToken(String(formData.get("started") ?? ""))) {
    return {
      ok: false,
      message:
        "Something went wrong with the form — please reload and try again.",
    };
  }

  const parsed = registrationSubmitSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    organization: formData.get("organization") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await withDbRetry(() =>
      registerForEvent(db, eventSlug, parsed.data)
    );
    if (!result.ok) {
      if (result.reason === "duplicate") {
        return { ok: true, done: true, duplicate: true };
      }
      // not_found / not_eligible / closed — one message, no detail leak.
      return {
        ok: false,
        message: "Registration isn't available for this event.",
      };
    }
    return { ok: true, done: true };
  } catch {
    return {
      ok: false,
      message:
        "Could not save your registration right now. Please try again.",
    };
  }
}
