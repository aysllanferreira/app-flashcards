import { describe, expect, it } from 'vitest';
import { clozeNumbers, render } from './render.js';

describe('render', () => {
  it('replaces fields by name, and unknown or empty fields with nothing', () => {
    expect(render('{{Front}}', { Front: 'hola' }, { side: 'front' })).toBe('hola');
    expect(render('[{{Missing}}]', { Front: 'hola' }, { side: 'front' })).toBe('[]');
    expect(render('[{{Back}}]', { Back: '' }, { side: 'front' })).toBe('[]');
  });

  it('puts the rendered front in place of {{FrontSide}} on the back', () => {
    const fields = { Front: 'hola', Back: 'hello' };
    const front = render('{{Front}}', fields, { side: 'front' });
    const back = render('{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}', fields, {
      side: 'back',
      frontHtml: front,
    });
    expect(back.indexOf('hola')).toBeLessThan(back.indexOf('<hr id=answer>'));
    expect(back.indexOf('hello')).toBeGreaterThan(back.indexOf('<hr id=answer>'));
  });

  it('hides the active cloze on the front and reveals it on the back', () => {
    const fields = { Text: '{{c1::Madrid}} is in {{c2::Spain}}' };
    expect(render('{{cloze:Text}}', fields, { side: 'front', clozeIndex: 1 })).toBe(
      '<span class="cloze">[...]</span> is in Spain',
    );
    expect(render('{{cloze:Text}}', fields, { side: 'back', clozeIndex: 1 })).toBe(
      '<span class="cloze">Madrid</span> is in Spain',
    );
    expect(render('{{cloze:Text}}', fields, { side: 'front', clozeIndex: 2 })).toBe(
      'Madrid is in <span class="cloze">[...]</span>',
    );
  });

  it('shows a cloze hint instead of [...]', () => {
    expect(
      render('{{cloze:Text}}', { Text: '{{c1::Madrid::capital}}' }, { side: 'front', clozeIndex: 1 }),
    ).toBe('<span class="cloze">[capital]</span>');
  });
});

describe('clozeNumbers', () => {
  it('lists distinct numbers in ascending order', () => {
    expect(clozeNumbers('{{c2::b}} {{c1::a}} {{c2::c}}')).toEqual([1, 2]);
    expect(clozeNumbers('{{c1::a::hint}} and {{c10::z}}')).toEqual([1, 10]);
    expect(clozeNumbers('no deletions, {{c0::zero}} {not::a cloze}')).toEqual([]);
  });
});
