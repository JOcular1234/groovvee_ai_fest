import "server-only";

import { after } from "next/server";

import {
  isEmailConfigured,
  sendGmail,
  senderAddress,
  type EmailMessage,
} from "@/lib/email/gmail";

export { isEmailConfigured, type EmailMessage };

// Absolute base URL for links inside emails. SITE_URL is required in
// production — request Host headers are never trusted for this.
export function siteUrl(): string {
  const url = process.env.SITE_URL?.replace(/\/+$/, "");
  if (url) return url;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SITE_URL is not configured");
  }
  return "http://localhost:3000";
}

// Comma-separated ADMIN_ALERT_EMAILS; falls back to the sending mailbox.
export function adminAlertRecipients(): string[] {
  const list = (process.env.ADMIN_ALERT_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length) return list;
  const sender = senderAddress();
  return sender ? [sender] : [];
}

async function deliver(msg: EmailMessage): Promise<void> {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.error("[email] not configured — dropped:", msg.subject);
    } else {
      // Dev convenience: show the message (including any confirm link).
      console.info(`[email:dev] to=${msg.to} subject=${msg.subject}\n${msg.text}`);
    }
    return;
  }
  try {
    await sendGmail(msg);
  } catch (err) {
    // Recipient addresses are personal data — log the failure, not the address.
    console.error("[email] send failed:", msg.subject, err instanceof Error ? err.message : err);
  }
}

// Sends after the response is flushed so a slow/failed provider never blocks
// or breaks the visitor's submission. Must be called from a server action,
// route handler or server component.
export function queueEmail(...messages: EmailMessage[]): void {
  if (!messages.length) return;
  after(async () => {
    for (const m of messages) await deliver(m);
  });
}

export function queueAdminAlert(msg: Omit<EmailMessage, "to">): void {
  queueEmail(...adminAlertRecipients().map((to) => ({ ...msg, to })));
}
