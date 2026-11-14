import "server-only";

// Gmail API sender over OAuth2 (refresh-token flow) — plain fetch, no SDK.
// The refresh token must belong to GMAIL_SENDER (or an account allowed to
// send as it) and carry the https://www.googleapis.com/auth/gmail.send scope.

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Gmail OAuth2 is not configured (GMAIL_* env vars)");
  }
}

function config() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const sender = process.env.GMAIL_SENDER;
  if (!clientId || !clientSecret || !refreshToken || !sender) return null;
  return { clientId, clientSecret, refreshToken, sender };
}

export function isEmailConfigured(): boolean {
  return config() !== null;
}

export function senderAddress(): string | null {
  return process.env.GMAIL_SENDER ?? null;
}

// Access tokens live ~1h; cache per process and refresh a minute early.
let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(cfg: NonNullable<ReturnType<typeof config>>) {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: cfg.refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!res.ok || !data.access_token) {
    // Never log the response body verbatim — keep it to the error code.
    throw new Error(`Gmail token refresh failed (${res.status} ${data.error ?? ""})`);
  }
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cached.token;
}

const ADDRESS_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;

// Header values can never contain CR/LF — that's what stops header injection
// through user-supplied fields like a visitor's email used as Reply-To.
function headerSafe(v: string): string {
  return v.replace(/[\r\n]+/g, " ").trim();
}

function encodeWord(v: string): string {
  return /^[\x20-\x7e]*$/.test(v)
    ? v
    : `=?UTF-8?B?${Buffer.from(v, "utf8").toString("base64")}?=`;
}

function b64Lines(s: string): string {
  return Buffer.from(s, "utf8").toString("base64").replace(/.{76}/g, "$&\r\n");
}

export function buildMime(from: string, msg: EmailMessage): string {
  const to = headerSafe(msg.to);
  if (!ADDRESS_RE.test(to)) throw new Error("Invalid recipient address");
  const replyTo = msg.replyTo ? headerSafe(msg.replyTo) : null;
  const boundary = `gvf_${crypto.randomUUID()}`;
  const headers = [
    `From: ${encodeWord("GrooVVee AI Fest")} <${headerSafe(from)}>`,
    `To: ${to}`,
    ...(replyTo && ADDRESS_RE.test(replyTo) ? [`Reply-To: ${replyTo}`] : []),
    `Subject: ${encodeWord(headerSafe(msg.subject))}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  return [
    ...headers,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64Lines(msg.text),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64Lines(msg.html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

export async function sendGmail(msg: EmailMessage): Promise<void> {
  const cfg = config();
  if (!cfg) throw new EmailNotConfiguredError();
  const raw = Buffer.from(buildMime(cfg.sender, msg), "utf8").toString("base64url");
  const send = async (token: string) =>
    fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
      signal: AbortSignal.timeout(15_000),
    });

  let res = await send(await accessToken(cfg));
  if (res.status === 401) {
    cached = null; // token revoked/expired early — refresh once and retry
    res = await send(await accessToken(cfg));
  }
  if (!res.ok) throw new Error(`Gmail send failed (${res.status})`);
}
