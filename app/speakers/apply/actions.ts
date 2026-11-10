"use server";

import { submitApplication } from "@/lib/applications";
import { db, withDbRetry } from "@/lib/db";
import { verifyFormToken } from "@/lib/form-token";
import { socialLinkSchema } from "@/lib/validation/speaker";
import { applicationSubmitSchema } from "@/lib/validation/application";

export type ApplyFormState = {
  ok: boolean;
  done?: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

// Collects the repeatable link fields: label_i / url_i pairs.
function collectLinks(formData: FormData) {
  const links: { label: string; url: string }[] = [];
  for (const [key, value] of formData.entries()) {
    const m = /^link_label_(\d+)$/.exec(key);
    if (!m) continue;
    const url = String(formData.get(`link_url_${m[1]}`) ?? "").trim();
    const label = String(value).trim();
    if (!label && !url) continue;
    const parsed = socialLinkSchema.safeParse({ label, url });
    if (parsed.success) links.push(parsed.data);
    else links.push({ label, url }); // let the object schema surface the error
  }
  return links;
}

export async function submitApplicationAction(
  _prev: ApplyFormState,
  formData: FormData
): Promise<ApplyFormState> {
  // Honeypot: real users never see or fill this field. Named "gvf_extra" so
  // browser autofill/managers won't populate it (a name like "website" gets
  // autofilled and discards legitimate submissions).
  if (String(formData.get("gvf_extra") ?? "") !== "") {
    console.warn("[apply] honeypot triggered — fake success returned");
    return { ok: true, done: true }; // pretend success — waste the bot's time
  }
  // Minimum-fill-time token (process-signed; see lib/form-token.ts).
  if (!verifyFormToken(String(formData.get("started") ?? ""))) {
    return {
      ok: false,
      message: "Something went wrong with the form — please reload and try again.",
    };
  }

  const parsed = applicationSubmitSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    organization: formData.get("organization") ?? "",
    talkTitle: formData.get("talkTitle") ?? "",
    bio: formData.get("bio") ?? "",
    links: collectLinks(formData),
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await withDbRetry(() => submitApplication(db, parsed.data));
  } catch {
    return {
      ok: false,
      message: "Could not submit your application right now. Please try again.",
    };
  }
  return { ok: true, done: true };
}
