// Minimal, safe formatting for news post bodies. Supported syntax:
//   ## Heading / ### Subheading
//   - bullet / * bullet      1. numbered
//   > quote
//   **bold**  *italic*  [text](https://… or /path)  bare https:// links
// Blank lines separate paragraphs; single newlines become line breaks, so
// existing plain-text posts render exactly as before. Output is a data
// structure rendered as React elements (never raw HTML), so it can't inject
// markup.

export type Inline =
  | { t: "text"; v: string }
  | { t: "strong" | "em"; c: Inline[] }
  | { t: "link"; href: string; external: boolean; c: Inline[] };

export type Block =
  | { t: "p" | "quote"; lines: Inline[][] }
  | { t: "h2" | "h3"; c: Inline[] }
  | { t: "ul" | "ol"; items: Inline[][] };

// https:// links, same-site /paths (not protocol-relative //), mailto:.
export function safeHref(href: string): string | null {
  if (href.startsWith("https://") || href.startsWith("mailto:")) return href;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  return null;
}

const INLINE_RE =
  /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+?)\*\*|\*([^*\s][^*\n]*?)\*|(https:\/\/[^\s<>()]*[^\s<>().,;:!?'"])/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  const push = (v: string) => {
    if (!v) return;
    const prev = out[out.length - 1];
    if (prev?.t === "text") prev.v += v;
    else out.push({ t: "text", v });
  };
  for (const m of text.matchAll(INLINE_RE)) {
    push(text.slice(last, m.index));
    last = m.index + m[0].length;
    const [raw, linkText, linkHref, bold, italic, bare] = m;
    if (linkText !== undefined) {
      const href = safeHref(linkHref);
      if (href) {
        out.push({
          t: "link",
          href,
          external: !href.startsWith("/"),
          c: parseInline(linkText),
        });
      } else push(raw);
    } else if (bold !== undefined) {
      out.push({ t: "strong", c: parseInline(bold) });
    } else if (italic !== undefined) {
      out.push({ t: "em", c: parseInline(italic) });
    } else if (bare !== undefined) {
      out.push({
        t: "link",
        href: bare,
        external: true,
        c: [{ t: "text", v: bare }],
      });
    }
  }
  push(text.slice(last));
  return out;
}

const UL_RE = /^\s*[-*]\s+(.*)$/;
const OL_RE = /^\s*\d+[.)]\s+(.*)$/;
const QUOTE_RE = /^\s*>\s?(.*)$/;
const H_RE = /^(#{2,3})\s+(.*)$/;

export function parseBody(body: string): Block[] {
  const blocks: Block[] = [];
  let para: Inline[][] | null = null;
  let quote: Inline[][] | null = null;
  let list: Extract<Block, { t: "ul" | "ol" }> | null = null;

  const flush = () => {
    if (para) blocks.push({ t: "p", lines: para });
    if (quote) blocks.push({ t: "quote", lines: quote });
    if (list) blocks.push(list);
    para = quote = list = null;
  };

  for (const rawLine of body.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    const h = H_RE.exec(line);
    const ul = UL_RE.exec(line);
    const ol = OL_RE.exec(line);
    const q = QUOTE_RE.exec(line);
    if (h) {
      flush();
      blocks.push({ t: h[1].length === 2 ? "h2" : "h3", c: parseInline(h[2]) });
    } else if (ul || ol) {
      const t = ul ? "ul" : "ol";
      if (!list || list.t !== t) {
        flush();
        list = { t, items: [] };
      }
      list.items.push(parseInline((ul ?? ol)![1]));
    } else if (q) {
      if (!quote) flush();
      (quote ??= []).push(parseInline(q[1]));
    } else {
      if (!para) flush();
      (para ??= []).push(parseInline(line));
    }
  }
  flush();
  return blocks;
}

function inlineText(nodes: Inline[]): string {
  return nodes.map((n) => (n.t === "text" ? n.v : inlineText(n.c))).join("");
}

// Body with formatting markers removed — for reading time and summaries.
export function plainText(body: string): string {
  return parseBody(body)
    .map((b) => {
      switch (b.t) {
        case "ul":
        case "ol":
          return b.items.map(inlineText).join("\n");
        case "h2":
        case "h3":
          return inlineText(b.c);
        default:
          return b.lines.map(inlineText).join("\n");
      }
    })
    .join("\n\n");
}

const WORDS_PER_MINUTE = 200;

export function readingMinutes(body: string): number {
  const words = plainText(body).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
