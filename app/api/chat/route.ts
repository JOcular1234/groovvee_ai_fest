import { NextRequest, NextResponse } from "next/server";

import { db, withDbRetry } from "@/lib/db";
import { isAllowedOrigin } from "@/lib/auth/csrf";
import { clientIp } from "@/lib/auth/ip";
import { verifyFormToken } from "@/lib/form-token";
import { chatRequestSchema, toGeminiContents } from "@/lib/validation/chat";
import { buildSystemPrompt } from "@/lib/chat/prompt";
import { consumeChatQuota } from "@/lib/chat/rate-limit";
import {
  ChatNotConfiguredError,
  ChatProviderError,
  geminiChatSource,
  runChat,
  type ChatStreamSource,
} from "@/lib/chat/gemini";
import { CHAT_TOOL_DECLS } from "@/lib/chat/tools";
import { chatToolExecutor } from "@/lib/chat/tool-deps";

const NO_STORE = { "Cache-Control": "no-store" };

function fail(
  status: number,
  error: string,
  headers: Record<string, string> = {}
) {
  return NextResponse.json(
    { error },
    { status, headers: { ...NO_STORE, ...headers } }
  );
}

const UNAVAILABLE = "The assistant is unavailable right now. Please try again.";

export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req)) return fail(403, "Forbidden");

  let body;
  try {
    body = chatRequestSchema.parse(await req.json());
  } catch {
    return fail(400, "Invalid request");
  }

  if (!verifyFormToken(body.token, 0)) {
    return fail(403, "Session expired — please resend.");
  }

  const throttle = await withDbRetry(() =>
    consumeChatQuota(db, clientIp(req))
  );
  if (!throttle.allowed) {
    return fail(
      429,
      "You're sending messages too quickly — give it a moment.",
      { "Retry-After": String(throttle.retryAfterSec) }
    );
  }

  let source: ChatStreamSource;
  try {
    source = geminiChatSource();
  } catch (err) {
    if (err instanceof ChatNotConfiguredError)
      return fail(503, "The assistant isn't configured yet.");
    throw err;
  }

  // Pull the first chunk before committing to a streamed response, so
  // provider/config failures still surface as a proper JSON error.
  const gen = runChat(source, {
    system: buildSystemPrompt(new Date(), body.timezone),
    contents: toGeminiContents(body.messages),
    tools: CHAT_TOOL_DECLS,
    executeTool: chatToolExecutor,
  });
  let first: IteratorResult<string>;
  try {
    first = await gen.next();
  } catch (err) {
    // Log the provider error server-side (message only — no conversation
    // content) so real failures are diagnosable.
    console.error("[chat] provider error:", err instanceof Error ? err.message : err);
    if (err instanceof ChatProviderError)
      return fail(err.retryable ? 503 : 502, UNAVAILABLE);
    return fail(502, UNAVAILABLE);
  }
  if (first.done || !first.value) {
    return fail(502, "The assistant returned an empty response — try again.");
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(first.value));
    },
    async pull(controller) {
      try {
        const next = await gen.next();
        if (next.done) controller.close();
        else controller.enqueue(encoder.encode(next.value));
      } catch {
        // Mid-stream failure — end cleanly; the client flags the reply.
        controller.close();
      }
    },
    async cancel() {
      await gen.return(undefined).catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      ...NO_STORE,
      "Content-Type": "text/plain; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
