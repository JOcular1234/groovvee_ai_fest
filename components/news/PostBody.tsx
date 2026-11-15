import { Fragment, type ReactNode } from "react";
import Link from "next/link";

import { parseBody, type Inline } from "@/lib/news-body";

const linkClass =
  "text-volt underline decoration-volt/40 underline-offset-4 transition-colors hover:decoration-volt";

function renderInline(nodes: Inline[]): ReactNode {
  return nodes.map((n, i) => {
    switch (n.t) {
      case "text":
        return <Fragment key={i}>{n.v}</Fragment>;
      case "strong":
        return (
          <strong key={i} className="font-semibold text-white">
            {renderInline(n.c)}
          </strong>
        );
      case "em":
        return <em key={i}>{renderInline(n.c)}</em>;
      case "link":
        return n.external ? (
          <a
            key={i}
            href={n.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={linkClass}
          >
            {renderInline(n.c)}
          </a>
        ) : (
          <Link key={i} href={n.href} className={linkClass}>
            {renderInline(n.c)}
          </Link>
        );
    }
  });
}

const withBreaks = (lines: Inline[][]) =>
  lines.map((l, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {renderInline(l)}
    </Fragment>
  ));

export function PostBody({ body }: { body: string }) {
  return (
    <div className="space-y-5 leading-relaxed text-muted">
      {parseBody(body).map((b, i) => {
        switch (b.t) {
          case "h2":
            return (
              <h2
                key={i}
                className="pt-6 font-display text-3xl uppercase leading-tight text-white"
              >
                {renderInline(b.c)}
              </h2>
            );
          case "h3":
            return (
              <h3
                key={i}
                className="pt-4 text-xl font-semibold leading-snug text-white"
              >
                {renderInline(b.c)}
              </h3>
            );
          case "ul":
          case "ol": {
            const List = b.t;
            return (
              <List
                key={i}
                className={`space-y-2 pl-6 marker:text-volt ${b.t === "ul" ? "list-disc" : "list-decimal"}`}
              >
                {b.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </List>
            );
          }
          case "quote":
            return (
              <blockquote
                key={i}
                className="border-l-2 border-volt pl-5 text-lg italic text-white/90"
              >
                {withBreaks(b.lines)}
              </blockquote>
            );
          case "p":
            return <p key={i}>{withBreaks(b.lines)}</p>;
        }
      })}
    </div>
  );
}
