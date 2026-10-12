"use client";

import { cardsFor, fieldsByName, render, sanitizeFieldHtml } from "card-templates";
import { useTheme } from "next-themes";
import { useMemo, useRef, useState } from "react";
import type { ApiSchemas } from "../_lib/api";
import { cardLabel } from "../_lib/format";

type NoteType = ApiSchemas["NoteType"];

/**
 * Every card the note will produce, front and back, computed in the browser
 * with the same rules the API uses.
 */
export function CardPreview({ noteType, fields }: { noteType: NoteType; fields: Record<string, string> }) {
  const clean = useMemo(
    () => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, sanitizeFieldHtml(v)])),
    [fields],
  );
  const planned = useMemo(() => cardsFor(noteType, clean), [noteType, clean]);
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, Math.max(0, planned.length - 1));
  const card = planned[index];

  const sides = useMemo(() => {
    if (!card) return null;
    const template = noteType.templates.find((t) => t.id === card.templateId)!;
    const named = fieldsByName(noteType, clean);
    const options = { clozeIndex: card.clozeIndex };
    const front = render(template.frontHtml, named, { side: "front", ...options });
    const back = render(template.backHtml, named, { side: "back", frontHtml: front, ...options });
    return { front, back };
  }, [card, noteType, clean]);

  const labelOf = (c: (typeof planned)[number]) =>
    cardLabel({
      clozeIndex: c.clozeIndex,
      templateName: noteType.templates.find((t) => t.id === c.templateId)?.name ?? "Card",
    });

  return (
    <aside aria-label="Preview" className="grid gap-2.5 rounded-xl border bg-card p-3.5 text-card-foreground lg:sticky lg:top-20">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-base font-medium">Preview</h2>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {planned.length === 1 ? "1 card" : `${planned.length} cards`}
        </span>
      </div>
      {planned.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {noteType.kind === "cloze"
            ? "No cards yet. Select some text and use Cloze to hide it."
            : "No cards yet. Fill in the field the first card shows."}
        </p>
      ) : (
        <>
          {planned.length > 1 ? (
            <div role="group" aria-label="Card" className="flex flex-wrap gap-1.5">
              {planned.map((c, i) => (
                <button
                  key={`${c.templateId}-${c.clozeIndex}`}
                  type="button"
                  aria-pressed={i === index}
                  onClick={() => setSelected(i)}
                  className="h-7 rounded-full border border-input px-2.5 text-[12.5px] text-muted-foreground aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                >
                  {labelOf(c)}
                </button>
              ))}
            </div>
          ) : null}
          {sides ? (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
              <Side label="Front" html={sides.front} css={noteType.css} />
              <Side label="Back" html={sides.back} css={noteType.css} />
            </div>
          ) : null}
        </>
      )}
      <p className="text-xs text-muted-foreground">Rendered with the {noteType.name} note type&apos;s CSS, in a sandbox.</p>
    </aside>
  );
}

/**
 * One side of a card in an iframe: the note type's CSS can't leak into the
 * app, and the template's HTML can't run scripts (no allow-scripts). It is
 * same-origin only so its height can be measured.
 */
function Side({ label, html, css }: { label: string; html: string; css: string }) {
  const { resolvedTheme } = useTheme();
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(108);
  // In the dark theme, cards use Anki's night colors (the --card-preview
  // tokens). resolvedTheme is undefined until next-themes mounts, so the
  // server never reads the DOM.
  const night = useMemo(() => {
    if (resolvedTheme !== "dark") return "";
    const style = getComputedStyle(document.documentElement);
    const token = (name: string) => style.getPropertyValue(name).trim();
    return (
      `.card{background-color:${token("--card-preview")}!important;color:${token("--card-preview-foreground")}!important}` +
      `.cloze{color:${token("--card-preview-cloze")}!important}`
    );
  }, [resolvedTheme]);

  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden}${css}.card{box-sizing:border-box;min-height:108px;padding:22px 16px}${night}</style></head><body><div class="card">${html}</div></body></html>`;

  return (
    <figure className="m-0 grid gap-1">
      <figcaption className="text-[11.5px] tracking-[0.06em] text-muted-foreground uppercase">{label}</figcaption>
      {/* Until next-themes knows the theme, a placeholder in the card color:
          rendering the frame first would flash light cards in the dark theme. */}
      {resolvedTheme === undefined ? (
        <div aria-hidden="true" className="w-full rounded-lg border bg-[var(--card-preview)]" style={{ height }} />
      ) : (
      <iframe
        ref={frame}
        title={`Card ${label.toLowerCase()}`}
        sandbox="allow-same-origin"
        srcDoc={srcDoc}
        onLoad={() => {
          const doc = frame.current?.contentDocument;
          if (doc) setHeight(Math.max(108, doc.documentElement.scrollHeight));
        }}
        className="w-full overflow-hidden rounded-lg border"
        style={{ height }}
      />
      )}
    </figure>
  );
}
