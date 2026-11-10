"use server";

import { submitMessage } from "@/lib/messages";
import { db, withDbRetry } from "@/lib/db";
import { verifyFormToken } from "@/lib/form-token";
import { messageSubmitSchema } from "@/lib/validation/message";

export type ContactFormState = {
  ok: boolean;
  done?: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function submitMessageAction(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  // Honeypot: real users never see or fill this field. Named "gvf_extra" so
  // browser autofill/managers won't populate it (a name like "website" gets
  // autofilled and discards legitimate submissions).
  if (String(formData.get("gvf_extra") ?? "") !== "") {
    console.warn("[contact] honeypot triggered — fake success returned");
    return { ok: true, done: true }; // pretend success — waste the bot's time
  }
  // Minimum-fill-time token (HMAC-signed; see lib/form-token.ts).
  if (!verifyFormToken(String(formData.get("started") ?? ""))) {
    return {
      ok: false,
      message: "Something went wrong with the form — please reload and try again.",
    };
  }

  const parsed = messageSubmitSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    type: formData.get("type") ?? "",
    subject: formData.get("subject") ?? "",
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await withDbRetry(() => submitMessage(db, parsed.data));
  } catch {
    return {
      ok: false,
      message: "Could not send your message right now. Please try again.",
    };
  }
  return { ok: true, done: true };
}
