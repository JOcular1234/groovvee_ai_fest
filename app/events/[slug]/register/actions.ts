"use server";

import { db, withDbRetry } from "@/lib/db";
import { isEmailConfigured, queueEmail, siteUrl } from "@/lib/email";
import {
  registrationAlreadyConfirmedEmail,
  registrationConfirmEmail,
} from "@/lib/email/templates";
import { guardPublicSubmission } from "@/lib/form-guard";
import { verifyFormToken } from "@/lib/form-token";
import { confirmRegistration, registerForEvent } from "@/lib/registrations";
import { registrationSubmitSchema } from "@/lib/validation/registration";

export type RegisterFormState = {
  ok: boolean;
  done?: boolean;
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
  const token = String(formData.get("started") ?? "");
  if (!verifyFormToken(token)) {
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
  if (String(formData.get("consent") ?? "") !== "on") {
    return {
      ok: false,
      errors: { consent: ["Please accept the privacy policy to continue."] },
    };
  }

  // Double opt-in can't work without outgoing mail — refuse rather than
  // leave visitors waiting for a link that will never arrive.
  if (!isEmailConfigured() && process.env.NODE_ENV === "production") {
    console.error("[register] email not configured — registration refused");
    return {
      ok: false,
      message: "Registration is temporarily unavailable. Please try again later.",
    };
  }

  try {
    const guard = await withDbRetry(() =>
      guardPublicSubmission(db, "registration", token)
    );
    if (!guard.ok) return { ok: false, message: guard.message };

    const result = await withDbRetry(() =>
      registerForEvent(db, eventSlug, parsed.data)
    );
    if (!result.ok) {
      // not_found / not_eligible / closed — one message, no detail leak.
      return {
        ok: false,
        message: "Registration isn't available for this event.",
      };
    }

    const base = siteUrl();
    if (result.status === "already_confirmed") {
      queueEmail({
        to: parsed.data.email,
        ...registrationAlreadyConfirmedEmail(
          result.event.title,
          `${base}/events/${result.event.slug}`
        ),
      });
    } else if (result.confirmToken) {
      queueEmail({
        to: parsed.data.email,
        ...registrationConfirmEmail(
          result.event.title,
          `${base}/events/${result.event.slug}/register/confirm?token=${encodeURIComponent(result.confirmToken)}`
        ),
      });
    }
    // Same answer for new, pending and already-registered emails.
    return { ok: true, done: true };
  } catch {
    return {
      ok: false,
      message:
        "Could not save your registration right now. Please try again.",
    };
  }
}

export type ConfirmState = {
  ok: boolean;
  done?: boolean;
  message?: string;
};

export async function confirmRegistrationAction(
  token: string
): Promise<ConfirmState> {
  try {
    const result = await withDbRetry(() => confirmRegistration(db, token));
    if (result.ok) return { ok: true, done: true };
    return {
      ok: false,
      message:
        result.reason === "closed"
          ? "This event has already started, so registration is closed."
          : "This confirmation link is invalid or was already used. If you registered again, use the newest email.",
    };
  } catch {
    return { ok: false, message: "Could not confirm right now. Please try again." };
  }
}
