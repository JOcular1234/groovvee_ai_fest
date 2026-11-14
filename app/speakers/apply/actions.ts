"use server";

import { submitApplication } from "@/lib/applications";
import { db, withDbRetry } from "@/lib/db";
import { queueAdminAlert, queueEmail, siteUrl } from "@/lib/email";
import { adminAlertEmail, submissionReceivedEmail } from "@/lib/email/templates";
import { guardPublicSubmission } from "@/lib/form-guard";
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
  const token = String(formData.get("started") ?? "");
  if (!verifyFormToken(token)) {
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
  if (String(formData.get("consent") ?? "") !== "on") {
    return {
      ok: false,
      errors: { consent: ["Please accept the privacy policy to continue."] },
    };
  }

  try {
    const guard = await withDbRetry(() =>
      guardPublicSubmission(db, "speaker", token)
    );
    if (!guard.ok) return { ok: false, message: guard.message };

    const saved = await withDbRetry(() => submitApplication(db, parsed.data));
    const d = parsed.data;
    queueEmail({ to: d.email, ...submissionReceivedEmail("speaker") });
    queueAdminAlert({
      replyTo: d.email,
      ...adminAlertEmail(
        `New speaker application: ${d.talkTitle ?? d.name}`,
        [
          ["From", `${d.name} <${d.email}>`],
          ["Organization", d.organization],
          ["Talk", d.talkTitle],
          ["Bio", d.bio],
          ["Links", d.links.map((l) => `${l.label}: ${l.url}`).join("\n")],
        ],
        `${siteUrl()}/admin/applications/${saved.id}`
      ),
    });
  } catch {
    return {
      ok: false,
      message: "Could not submit your application right now. Please try again.",
    };
  }
  return { ok: true, done: true };
}
