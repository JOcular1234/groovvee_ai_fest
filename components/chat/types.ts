export type ChatMsg = {
  id: number;
  role: "user" | "assistant";
  content: string;
  failed?: boolean;
};

export const WELCOME_MESSAGE =
  "Hey! I'm the GrooVVee AI Assistant. I can help you explore our AI communities, events, competitions and opportunities. What would you like to know?";

export const SUGGESTIONS = [
  "What is GrooVVee?",
  "How can I join an AI community?",
  "Tell me about AI Hack Wars.",
  "How can I become a speaker?",
  "How can my studio partner with GrooVVee?",
];
