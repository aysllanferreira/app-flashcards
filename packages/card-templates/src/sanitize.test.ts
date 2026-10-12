import { describe, expect, it } from 'vitest';
import { sanitizeFieldHtml, toPlainText } from './sanitize.js';

describe('sanitizeFieldHtml', () => {
  it('keeps bold, italic, underline and line breaks, without attributes', () => {
    expect(sanitizeFieldHtml('<b class="x">a</b> <i>b</i> <u>c</u><br>d')).toBe(
      '<b>a</b> <i>b</i> <u>c</u><br>d',
    );
    expect(sanitizeFieldHtml('<strong>a</strong><em>b</em>')).toBe(
      '<strong>a</strong><em>b</em>',
    );
  });

  it('drops scripts and styles with their content, and unwraps the rest', () => {
    expect(
      sanitizeFieldHtml(
        '<p onclick="x()"><b>bold</b> <a href="javascript:alert(1)">link</a><script>bad()</script></p>',
      ),
    ).toBe('<b>bold</b> link');
    expect(sanitizeFieldHtml('<style>b{}</style><span style="color:red">red</span>')).toBe('red');
  });

  it('removes event handlers and media', () => {
    expect(sanitizeFieldHtml('<img src=x onerror=alert(1)><b>hi</b>')).toBe('<b>hi</b>');
    expect(sanitizeFieldHtml('<b onmouseover="alert(1)">hi</b>')).toBe('<b>hi</b>');
  });

  it('turns paragraphs into line breaks', () => {
    expect(sanitizeFieldHtml('<p>uno</p><p><i>dos</i></p>')).toBe('uno<br><i>dos</i>');
    expect(sanitizeFieldHtml('<div>a</div>\n<div>b</div>')).toBe('a\n<br>b');
  });

  it('keeps cloze markers and escapes text', () => {
    expect(sanitizeFieldHtml('{{c1::Madrid}} is <b>in</b> Spain')).toBe(
      '{{c1::Madrid}} is <b>in</b> Spain',
    );
    expect(sanitizeFieldHtml('a &lt;b&gt; &amp; c')).toBe('a &lt;b&gt; &amp; c');
  });

  it('is idempotent', () => {
    for (const input of [
      '<p>uno</p><p><i>dos</i></p>',
      '<img src=x onerror=alert(1)><b>hi</b> &amp; <u>x</u>',
      '{{c1::a::hint}} <script>x</script><br>',
    ]) {
      const once = sanitizeFieldHtml(input);
      expect(sanitizeFieldHtml(once)).toBe(once);
    }
  });
});

describe('toPlainText', () => {
  it('removes markup, decodes entities and collapses spaces', () => {
    expect(toPlainText('<b>hola</b> amigo')).toBe('hola amigo');
    expect(toPlainText('uno<br>dos &amp; tres')).toBe('uno dos & tres');
    expect(toPlainText('  <i></i> ')).toBe('');
  });
});
