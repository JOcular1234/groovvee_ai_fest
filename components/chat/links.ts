// Classifies a link the assistant wrote. Model output is untrusted — event
// descriptions it reads come partly from external discovered events — so:
//   - "/path" on this site → internal link ("//host" and "/\host" are NOT
//     paths; browsers treat them as other origins)
//   - https:// on this site → internal link
//   - other https:// → external link, rendered with its hostname visible so
//     the label can't disguise where it goes
//   - anything else (http:, javascript:, data:, mailto:, …) → not a link
export type ChatLink =
  | { kind: "internal"; href: string }
  | { kind: "external"; href: string; host: string };

export function classifyChatLink(raw: string, ownHost: string): ChatLink | null {
  const href = raw.trim();
  if (/^\/(?![/\\])/.test(href)) {
    return /[\s\\]/.test(href) ? null : { kind: "internal", href };
  }
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (url.host === ownHost) {
    return { kind: "internal", href: `${url.pathname}${url.search}${url.hash}` };
  }
  return { kind: "external", href: url.toString(), host: url.hostname };
}
