import type { EmailMessage } from "@/lib/email/gmail";

// Visitor-facing emails go to addresses anyone can type into a public form,
// so they never echo visitor-supplied text (names, messages) — otherwise the
// forms become a relay for spam to arbitrary inboxes. Admin alerts include
// the full submission, HTML-escaped.

type Content = Omit<EmailMessage, "to" | "replyTo">;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif;color:#f5f5f5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#141414;border:1px solid #2a2a2a">
<tr><td style="padding:28px 32px;border-bottom:1px solid #2a2a2a;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#d4ff3a;font-weight:bold">GrooVVee AI Fest</td></tr>
<tr><td style="padding:32px"><h1 style="margin:0 0 16px;font-size:22px;color:#ffffff">${escapeHtml(title)}</h1>${bodyHtml}</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (s: string) =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#cfcfcf">${s}</p>`;

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#d4ff3a;color:#0a0a0a;padding:14px 28px;font-weight:bold;text-decoration:none;letter-spacing:1px;text-transform:uppercase;font-size:13px">${escapeHtml(label)}</a></p>`;

const ignoreNote =
  "If you didn't request this, you can safely ignore this email.";

export function registrationConfirmEmail(
  eventTitle: string,
  confirmUrl: string
): Content {
  const title = "Confirm your registration";
  return {
    subject: `Confirm your registration — ${eventTitle}`,
    text: `Please confirm your registration for ${eventTitle}:\n\n${confirmUrl}\n\nYour spot is only reserved once you confirm.\n\n${ignoreNote}`,
    html: layout(
      title,
      p(`Please confirm your registration for <strong>${escapeHtml(eventTitle)}</strong>.`) +
        button(confirmUrl, "Confirm registration") +
        p("Your spot is only reserved once you confirm.") +
        p(`<span style="font-size:13px;color:#8a8a8a">${ignoreNote}</span>`)
    ),
  };
}

export function registrationAlreadyConfirmedEmail(
  eventTitle: string,
  eventUrl: string
): Content {
  return {
    subject: `You're already registered — ${eventTitle}`,
    text: `Someone (hopefully you) tried to register this email for ${eventTitle} again. You're already registered — nothing else to do.\n\nEvent details: ${eventUrl}\n\n${ignoreNote}`,
    html: layout(
      "You're already registered",
      p(`This email is already registered for <strong>${escapeHtml(eventTitle)}</strong> — nothing else to do.`) +
        button(eventUrl, "View event") +
        p(`<span style="font-size:13px;color:#8a8a8a">${ignoreNote}</span>`)
    ),
  };
}

export function submissionReceivedEmail(
  kind: "contact" | "speaker" | "hack-wars",
  duplicate = false
): Content {
  const what = {
    contact: "your message",
    speaker: "your speaker application",
    "hack-wars": "your AI Hack Wars application",
  }[kind];
  const body = duplicate
    ? `We already have ${what} on file for this email, so nothing new was submitted. Our team will be in touch.`
    : `Thanks — we've received ${what}. Our team will review it and get back to you.`;
  const title = duplicate ? "Already received" : "We've got it";
  return {
    subject: duplicate
      ? `We already have ${what}`
      : `We've received ${what} — GrooVVee AI Fest`,
    text: `${body}\n\n${ignoreNote}`,
    html: layout(
      title,
      p(escapeHtml(body)) +
        p(`<span style="font-size:13px;color:#8a8a8a">${ignoreNote}</span>`)
    ),
  };
}

// Admin alert: a labelled field table plus a link into the admin screen.
export function adminAlertEmail(
  subject: string,
  fields: [label: string, value: string | null | undefined][],
  adminUrl: string
): Content {
  const rows = fields.filter(([, v]) => v);
  return {
    subject: `[GrooVVee admin] ${subject}`,
    text: `${subject}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nOpen in admin: ${adminUrl}`,
    html: layout(
      subject,
      `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px">${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:6px 12px 6px 0;vertical-align:top;color:#8a8a8a;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:6px 0;color:#f5f5f5;white-space:pre-wrap">${escapeHtml(String(v))}</td></tr>`
        )
        .join("")}</table>` + button(adminUrl, "Open in admin")
    ),
  };
}
