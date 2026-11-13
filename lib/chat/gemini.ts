import { GoogleGenAI } from "@google/genai";

import type { GeminiContent, GeminiPart } from "@/lib/validation/chat";

// Chat-specific Gemini integration — kept separate from the event-discovery
// provider (lib/discovery/providers/gemini.ts) so model, timeouts and retries
// can be tuned independently. Same operational pattern: env-overridable
// model, bounded retries, no credential or message logging.

// Gemini retires models quickly — keep it env-overridable (see the discovery
// provider comment). Defaults to the always-current flash alias, which also
// supports function calling.
const MODEL = process.env.GEMINI_CHAT_MODEL ?? "gemini-flash-latest";
const TIMEOUT_MS = 30_000;
// Interactive chat is latency-sensitive: one bounded retry before streaming
// starts rides out most 429/503 spikes. Mid-stream failures are never
// retried — they would duplicate partial output into the conversation.
const PRE_STREAM_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1_500;
const MAX_OUTPUT_TOKENS = 1024;

export class ChatNotConfiguredError extends Error {}
export class ChatProviderError extends Error {
  retryable: boolean;
  constructor(message: string, retryable = false) {
    super(message);
    this.retryable = retryable;
  }
}

// Tool/function-calling shapes — declared by the app, executed server-side.
export type ChatToolDecl = {
  name: string;
  description: string;
  parametersJsonSchema: Record<string, unknown>;
};

export type ChatToolCall = {
  name: string;
  args: Record<string, unknown>;
};

export type GenerateResult = {
  text?: string;
  toolCalls?: ChatToolCall[];
};

// Minimal structural interface over the SDK so tests can fake both the
// non-streamed generate (tool rounds) and the streamed answer without
// instantiating GoogleGenAI or making paid calls.
export interface ChatStreamSource {
  generate(params: {
    model: string;
    system: string;
    contents: GeminiContent[];
    signal: AbortSignal;
    maxOutputTokens: number;
    tools?: ChatToolDecl[];
  }): Promise<GenerateResult>;
  stream(params: {
    model: string;
    system: string;
    contents: GeminiContent[];
    signal: AbortSignal;
    maxOutputTokens: number;
  }): Promise<AsyncIterable<string>>;
}

export function geminiChatSource(): ChatStreamSource {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ChatNotConfiguredError(
      "Chat is not configured. Set GEMINI_API_KEY in the server environment."
    );
  }
  const ai = new GoogleGenAI({ apiKey });
  return {
    async generate({
      model,
      system,
      contents,
      signal,
      maxOutputTokens,
      tools,
    }) {
      const res = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: system,
          abortSignal: signal,
          maxOutputTokens,
          temperature: 0.4,
          tools: tools?.length
            ? [
                {
                  functionDeclarations: tools.map((t) => ({
                    name: t.name,
                    description: t.description,
                    parametersJsonSchema: t.parametersJsonSchema,
                  })),
                },
              ]
            : undefined,
        },
      });
      return {
        text: res.text,
        toolCalls: res.functionCalls
          ?.filter((c) => c.name)
          .map((c) => ({
            name: c.name!,
            args: (c.args ?? {}) as Record<string, unknown>,
          })),
      };
    },
    async stream({ model, system, contents, signal, maxOutputTokens }) {
      const res = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction: system,
          abortSignal: signal,
          maxOutputTokens,
          temperature: 0.4,
        },
      });
      return (async function* () {
        for await (const chunk of res) {
          if (chunk.text) yield chunk.text;
        }
      })();
    },
  };
}

export function isRetryableChatError(err: unknown): boolean {
  if (err instanceof ChatProviderError) return err.retryable;
  const msg = String(
    (err as { message?: string })?.message ?? err
  );
  return /429|500|502|503|504|timeout|ETIMEDOUT|ECONNRESET|RESOURCE_EXHAUSTED|UNAVAILABLE/i.test(
    msg
  );
}

function providerError(err: unknown): ChatProviderError {
  const msg = String((err as { message?: string })?.message ?? err).slice(
    0,
    300
  );
  return new ChatProviderError(
    `Chat provider request failed: ${msg}`,
    isRetryableChatError(err)
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function* streamChat(
  source: ChatStreamSource,
  params: { system: string; contents: GeminiContent[] }
): AsyncGenerator<string> {
  let stream: AsyncIterable<string> | null = null;
  for (let attempt = 0; attempt < PRE_STREAM_ATTEMPTS; attempt++) {
    try {
      stream = await source.stream({
        model: MODEL,
        system: params.system,
        contents: params.contents,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      });
      break;
    } catch (err) {
      if (attempt + 1 < PRE_STREAM_ATTEMPTS && isRetryableChatError(err)) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw err instanceof ChatProviderError ? err : providerError(err);
    }
  }
  try {
    for await (const chunk of stream!) yield chunk;
  } catch (err) {
    throw providerError(err);
  }
}

// --- Tool-calling orchestration ---

// At most 3 generate→execute round-trips before the final streamed answer,
// and at most 4 calls honoured per round — bounds cost and prevents the
// model looping on tools forever.
export const MAX_TOOL_ROUNDS = 3;
export const MAX_TOOL_CALLS_PER_ROUND = 4;

export type ChatToolExecutor = (
  name: string,
  args: unknown
) => Promise<unknown>;

async function generateOnce(
  source: ChatStreamSource,
  params: {
    system: string;
    contents: GeminiContent[];
    tools: ChatToolDecl[];
  }
): Promise<GenerateResult> {
  for (let attempt = 0; attempt < PRE_STREAM_ATTEMPTS; attempt++) {
    try {
      return await source.generate({
        model: MODEL,
        system: params.system,
        contents: params.contents,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        tools: params.tools,
      });
    } catch (err) {
      if (attempt + 1 < PRE_STREAM_ATTEMPTS && isRetryableChatError(err)) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw err instanceof ChatProviderError ? err : providerError(err);
    }
  }
  throw providerError(new Error("unreachable"));
}

// A tool round can return its final answer non-streamed — emit it in slices
// so the client still sees progressive output.
async function* emitChunked(text: string): AsyncGenerator<string> {
  for (let i = 0; i < text.length; i += 200) yield text.slice(i, i + 200);
}

// Full chat turn: optional bounded tool-call loop (non-streamed generate,
// server-side execution, results appended as functionResponse parts), then
// the streamed answer. If a round produces plain text with no tool calls,
// that IS the final answer — emit it and stop.
export async function* runChat(
  source: ChatStreamSource,
  params: {
    system: string;
    contents: GeminiContent[];
    tools?: ChatToolDecl[];
    executeTool?: ChatToolExecutor;
  }
): AsyncGenerator<string> {
  const convo = [...params.contents];
  const tools = params.tools ?? [];

  if (params.executeTool && tools.length) {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const res = await generateOnce(source, {
        system: params.system,
        contents: convo,
        tools,
      });
      const calls = res.toolCalls?.slice(0, MAX_TOOL_CALLS_PER_ROUND);
      if (calls?.length) {
        convo.push({
          role: "model",
          parts: calls.map(
            (c): GeminiPart => ({
              functionCall: { name: c.name, args: c.args },
            })
          ),
        });
        const responses: GeminiPart[] = [];
        for (const call of calls) {
          let output: unknown;
          try {
            output = await params.executeTool(call.name, call.args);
          } catch {
            output = { error: "Tool execution failed." };
          }
          responses.push({
            functionResponse: {
              name: call.name,
              response: { output: output ?? null } as Record<string, unknown>,
            },
          });
        }
        convo.push({ role: "user", parts: responses });
        continue;
      }
      if (res.text) {
        yield* emitChunked(res.text);
        return;
      }
      break;
    }

    // The loop ended without a final text answer (round limit reached, or a
    // round produced nothing). Before the streamed answer, inject a
    // server-side directive so the model reports the incomplete lookup
    // honestly instead of papering over it with invented events.
    convo.push({
      role: "user",
      parts: [
        {
          text: "(Internal note — not from the visitor: the event lookup step limit was reached. Answer using only results already returned; if the lookup could not be completed, say so plainly and suggest browsing /events. Do not invent events or details.)",
        },
      ],
    });
  }

  yield* streamChat(source, {
    system: params.system,
    contents: convo,
  });
}
