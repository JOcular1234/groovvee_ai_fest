import "dotenv/config";

import { sendGmail, isEmailConfigured, senderAddress } from "../lib/email/gmail";

// Sends a real test email through the Gmail OAuth2 path.
//   npx tsx scripts/test-email.ts you@example.com
// Verifies: env config, refresh-token exchange, gmail.send scope, and that
// the authenticated account may send as GMAIL_SENDER.

const to = process.argv[2];
if (!to) {
  console.error("usage: npx tsx scripts/test-email.ts <recipient>");
  process.exit(1);
}

if (!isEmailConfigured()) {
  console.error("GMAIL_* env vars are missing — check .env");
  process.exit(1);
}

console.log(`Sending test email to ${to} as ${senderAddress()} …`);

try {
  await sendGmail({
    to,
    subject: "GrooVVee email test",
    text: "If you can read this, Gmail OAuth2 sending works.",
    html: "<p>If you can read this, <strong>Gmail OAuth2 sending works</strong>.</p>",
  });
  console.log("Sent — check the inbox (and spam folder).");
} catch (err) {
  console.error("FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
}
