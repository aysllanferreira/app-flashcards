import { clozeNumbers, render } from './render.js';
import { toPlainText } from './sanitize.js';

/** A note type as the API returns it (GET /note-types), or the API's rows. */
export interface NoteTypeShape {
  kind: 'standard' | 'cloze';
  fields: { key: number; name: string }[];
  templates: { id: string; frontHtml: string; backHtml: string }[];
}

/** Field values keyed by field key, as notes store them. */
export type NoteFields = Record<string, string>;

export interface PlannedCard {
  templateId: string;
  clozeIndex: number;
}

/** Field values keyed by field name, as templates reference them. */
export function fieldsByName(
  noteType: Pick<NoteTypeShape, 'fields'>,
  fields: NoteFields,
): Record<string, string> {
  return Object.fromEntries(
    noteType.fields.map((f) => [f.name, fields[String(f.key)] ?? '']),
  );
}

/** The names of the fields a cloze note type's template reads with cloze:. */
export function clozeFields(noteType: NoteTypeShape): string[] {
  if (noteType.kind !== 'cloze') return [];
  const names = new Set<string>();
  for (const template of noteType.templates) {
    for (const match of template.frontHtml.matchAll(/\{\{\s*cloze:([^{}]+?)\s*\}\}/g)) {
      names.add(match[1].trim());
    }
  }
  return [...names];
}

/**
 * The cards a note produces. Standard: one per template whose front renders
 * to something other than markup and whitespace. Cloze: one per cloze number
 * in the fields the template reads with cloze:.
 */
export function cardsFor(noteType: NoteTypeShape, fields: NoteFields): PlannedCard[] {
  const named = fieldsByName(noteType, fields);
  if (noteType.kind === 'cloze') {
    const [template] = noteType.templates;
    if (!template) return [];
    const numbers = new Set(
      clozeFields(noteType).flatMap((name) => clozeNumbers(named[name] ?? '')),
    );
    return [...numbers]
      .sort((a, b) => a - b)
      .map((clozeIndex) => ({ templateId: template.id, clozeIndex }));
  }
  return noteType.templates
    .filter((t) => toPlainText(render(t.frontHtml, named, { side: 'front' })) !== '')
    .map((t) => ({ templateId: t.id, clozeIndex: 0 }));
}
