import { z } from "zod";

import { isValidTimeZone } from "@/lib/datetime";

export const CHAT_MAX_MESSAGES = 20;
export const CHAT_MAX_USER_CHARS = 500;
export const CHAT_MAX_ASSISTANT_CHARS = 8_000;

// Only the two roles the app itself produces — visitors can never inject
// system/developer instructions through the messages array.
export const chatMessageSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("user"),
    content: z.string().trim().min(1).max(CHAT_MAX_USER_CHARS),
  }),
  z.object({
    role: z.literal("assistant"),
    content: z.string().trim().min(1).max(CHAT_MAX_ASSISTANT_CHARS),
  }),
]);

export const chatRequestSchema = z.object({
  token: z.string().min(1).max(200),
  // Visitor's IANA timezone, used only to resolve relative date questions —
  // validated, never trusted blindly.
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .refine(isValidTimeZone, { error: "Invalid timezone" })
    .optional(),
  messages: z
    .array(chatMessageSchema)
    .min(1)
    .max(CHAT_MAX_MESSAGES)
    .refine((m) => m[m.length - 1]?.role === "user", {
      error: "Last message must be from the user",
    }),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | {
      functionResponse: {
        name: string;
        response: Record<string, unknown>;
      };
    };

export type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

// Maps app roles to Gemini roles and merges consecutive same-role turns —
// the API expects alternating user/model content.
export function toGeminiContents(messages: ChatMessage[]): GeminiContent[] {
  const out: GeminiContent[] = [];
  for (const m of messages) {
    const role = m.role === "assistant" ? ("model" as const) : ("user" as const);
    const last = out[out.length - 1];
    if (last && last.role === role) last.parts.push({ text: m.content });
    else out.push({ role, parts: [{ text: m.content }] });
  }
  return out;
}
