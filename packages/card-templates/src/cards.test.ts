import { describe, expect, it } from 'vitest';
import { cardsFor, clozeFields, type NoteTypeShape } from './cards.js';

const FRONT_BACK = [
  { key: 1, name: 'Front' },
  { key: 2, name: 'Back' },
];
const BACK = '{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}';

const basic: NoteTypeShape = {
  kind: 'standard',
  fields: FRONT_BACK,
  templates: [{ id: 't1', frontHtml: '{{Front}}', backHtml: BACK }],
};
const reversed: NoteTypeShape = {
  kind: 'standard',
  fields: FRONT_BACK,
  templates: [
    { id: 't1', frontHtml: '{{Front}}', backHtml: BACK },
    { id: 't2', frontHtml: '{{Back}}', backHtml: '{{FrontSide}}<hr id=answer>{{Front}}' },
  ],
};
const cloze: NoteTypeShape = {
  kind: 'cloze',
  fields: [
    { key: 1, name: 'Text' },
    { key: 2, name: 'Back Extra' },
  ],
  templates: [{ id: 'c', frontHtml: '{{cloze:Text}}', backHtml: '{{cloze:Text}}<br>\n{{Back Extra}}' }],
};

describe('cardsFor', () => {
  it('gives Basic one card', () => {
    expect(cardsFor(basic, { '1': 'hola', '2': 'hello' })).toEqual([
      { templateId: 't1', clozeIndex: 0 },
    ]);
  });

  it('gives Basic (and reversed card) two cards, or one when Back is empty', () => {
    expect(cardsFor(reversed, { '1': 'hola', '2': 'hello' })).toHaveLength(2);
    expect(cardsFor(reversed, { '1': 'hola', '2': '' })).toEqual([
      { templateId: 't1', clozeIndex: 0 },
    ]);
    // Markup alone doesn't count as content.
    expect(cardsFor(reversed, { '1': 'hola', '2': '<b></b> <br>' })).toHaveLength(1);
  });

  it('gives no card when no front has content', () => {
    expect(cardsFor(basic, { '1': '', '2': 'hello' })).toEqual([]);
  });

  it('gives Cloze one card per cloze number', () => {
    expect(cardsFor(cloze, { '1': '{{c1::a}} {{c2::b}} {{c2::c}}' })).toEqual([
      { templateId: 'c', clozeIndex: 1 },
      { templateId: 'c', clozeIndex: 2 },
    ]);
    expect(cardsFor(cloze, { '1': 'no deletions', '2': '{{c1::not read}}' })).toEqual([]);
  });
});

describe('clozeFields', () => {
  it('names the fields a cloze template reads, and none for standard types', () => {
    expect(clozeFields(cloze)).toEqual(['Text']);
    expect(clozeFields(reversed)).toEqual([]);
  });
});
