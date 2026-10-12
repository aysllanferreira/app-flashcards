// A small, explicit subset of Anki's template syntax: {{Field}}, {{FrontSide}}
// and {{cloze:Field}}. Field values are already sanitized HTML; unknown or
// empty fields render as nothing.

export type Side = 'front' | 'back';

export interface RenderOptions {
  side: Side;
  /** The cloze number this card asks about; 0 for standard note types. */
  clozeIndex?: number;
  /** The rendered front, for {{FrontSide}} on the back. */
  frontHtml?: string;
}

// {{c1::text}} or {{c1::text::hint}}; text and hint can't contain "}}" or "::".
const CLOZE = /\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g;
const TAG = /\{\{\s*([^{}]+?)\s*\}\}/g;

/** The distinct cloze numbers in a text, ascending. */
export function clozeNumbers(text: string): number[] {
  const found = new Set<number>();
  for (const match of text.matchAll(CLOZE)) {
    const n = Number(match[1]);
    if (n > 0) found.add(n);
  }
  return [...found].sort((a, b) => a - b);
}

/** Renders `template` with `fields`, keyed by field name. */
export function render(
  template: string,
  fields: Record<string, string>,
  { side, clozeIndex = 0, frontHtml = '' }: RenderOptions,
): string {
  return template.replace(TAG, (_whole, tag: string) => {
    if (tag === 'FrontSide') return side === 'back' ? frontHtml : '';
    if (tag.startsWith('cloze:')) {
      const value = fields[tag.slice('cloze:'.length).trim()] ?? '';
      return renderCloze(value, side, clozeIndex);
    }
    return fields[tag] ?? '';
  });
}

function renderCloze(value: string, side: Side, clozeIndex: number): string {
  return value.replace(
    CLOZE,
    (_whole, n: string, text: string, hint: string | undefined) => {
      if (Number(n) !== clozeIndex) return text;
      if (side === 'back') return `<span class="cloze">${text}</span>`;
      return `<span class="cloze">[${hint ?? '...'}]</span>`;
    },
  );
}
