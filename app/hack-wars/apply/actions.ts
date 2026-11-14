"use server";

import {
  DUPLICATE_APPLICATION,
  findOpenHackWarsCompetition,
  REGISTRATION_CLOSED,
  submitHackWarsApplication,
} from "@/lib/hack-wars";
import { db, withDbRetry } from "@/lib/db";
import { queueAdminAlert, queueEmail, siteUrl } from "@/lib/email";
import { adminAlertEmail, submissionReceivedEmail } from "@/lib/email/templates";
import { guardPublicSubmission } from "@/lib/form-guard";
import { verifyFormToken } from "@/lib/form-token";
import { hackWarsApplySchema } from "@/lib/validation/hack-wars";

export type HackWarsFormState = {
  ok: boolean;
  done?: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

// Collects repeatable member fields: member_name_i / member_email_i /
// member_school_i. Anything past the two-member cap is ignored at the
// schema level, which enforces the hard 3-person team limit.
function collectMembers(formData: FormData) {
  const members: { name: string; email: string; school: string }[] = [];
  for (const [key, value] of formData.entries()) {
    const m = /^member_name_(\d+)$/.exec(key);
    if (!m) continue;
    const name = String(value).trim();
    const email = String(formData.get(`member_email_${m[1]}`) ?? "").trim();
    const school = String(formData.get(`member_school_${m[1]}`) ?? "").trim();
    if (!name && !email && !school) continue;
    members.push({ name, email, school });
  }
  return members;
}

export async function submitHackWarsApplicationAction(
  _prev: HackWarsFormState,
  formData: FormData
): Promise<HackWarsFormState> {
  // Honeypot: real users never see or fill this field.
  if (String(formData.get("gvf_extra") ?? "") !== "") {
    console.warn("[hack-wars] honeypot triggered — fake success returned");
    return { ok: true, done: true };
  }
  const token = String(formData.get("started") ?? "");
  if (!verifyFormToken(token)) {
    return {
      ok: false,
      message: "Something went wrong with the form — please reload and try again.",
    };
  }

  const parsed = hackWarsApplySchema.safeParse({
    participation: formData.get("participation") ?? "",
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    school: formData.get("school") ?? "",
    major: formData.get("major") ?? "",
    gradYear: formData.get("gradYear") ?? "",
    intro: formData.get("intro") ?? "",
    previousExperience: formData.get("previousExperience") ?? "",
    teamName: formData.get("teamName") ?? "",
    members: collectMembers(formData),
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

  // Server-side eligibility: only a live REGISTRATION_OPEN Hack Wars
  // competition accepts applications.
  let competitionId: string;
  try {
    const competition = await withDbRetry(() =>
      findOpenHackWarsCompetition(db)
    );
    if (!competition) {
      return {
        ok: false,
        message: "Registration is not currently open for AI Hack Wars.",
      };
    }
    competitionId = competition.id;
  } catch {
    return {
      ok: false,
      message: "Could not verify registration status. Please try again.",
    };
  }

  const d = parsed.data;
  try {
    const guard = await withDbRetry(() =>
      guardPublicSubmission(db, "hack-wars", token)
    );
    if (!guard.ok) return { ok: false, message: guard.message };

    const saved = await withDbRetry(() =>
      submitHackWarsApplication(db, competitionId, d)
    );
    queueEmail({ to: d.email, ...submissionReceivedEmail("hack-wars") });
    queueAdminAlert({
      replyTo: d.email,
      ...adminAlertEmail(
        `New Hack Wars application: ${d.teamName ?? d.name}`,
        [
          ["Contact", `${d.name} <${d.email}>`],
          ["Phone", d.phone],
          ["School", d.school],
          ["Participation", d.isTeam ? `Team "${d.teamName}"` : "Individual"],
          ["Members", d.members.map((m) => `${m.name} <${m.email}>${m.school ? ` — ${m.school}` : ""}`).join("\n")],
          ["Intro", d.intro],
        ],
        `${siteUrl()}/admin/hack-wars/${saved.id}`
      ),
    });
  } catch (err) {
    // Same on-screen answer as a new application — whether an email has
    // applied is only told to that inbox.
    if (err instanceof Error && err.message === DUPLICATE_APPLICATION) {
      queueEmail({ to: d.email, ...submissionReceivedEmail("hack-wars", true) });
      return { ok: true, done: true };
    }
    if (err instanceof Error && err.message === REGISTRATION_CLOSED) {
      return {
        ok: false,
        message: "Registration is not currently open for AI Hack Wars.",
      };
    }
    return {
      ok: false,
      message: "Could not submit your application right now. Please try again.",
    };
  }
  return { ok: true, done: true };
}
