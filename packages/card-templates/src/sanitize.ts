import { type ChildNode, isTag, isText } from 'domhandler';
import { decodeHTML, escapeText } from 'entities';
import { parseDocument } from 'htmlparser2';

// The markup a field may keep, with no attributes. Everything else is
// unwrapped to its text, except script and style, which go with their content.
const KEEP = new Set(['b', 'strong', 'i', 'em', 'u', 'br']);
const DROP = new Set(['script', 'style']);
// Blocks that become line breaks between them (Tiptap writes paragraphs).
const BLOCKS = new Set(['p', 'div']);

/**
 * Sanitizes a field value to bold, italic, underline and line breaks.
 * Idempotent, and the same in Node.js and the browser (no DOM needed).
 */
export function sanitizeFieldHtml(html: string): string {
  return serialize(parseDocument(html).children);
}

function serialize(nodes: ChildNode[]): string {
  let out = '';
  let previousWasBlock = false;
  for (const node of nodes) {
    if (isText(node)) {
      // Whitespace between blocks ("<p>a</p>\n<p>b</p>") keeps them apart.
      if (node.data.trim() !== '') previousWasBlock = false;
      out += escapeText(node.data);
      continue;
    }
    if (!isTag(node)) continue; // comments, processing instructions
    const tag = node.name.toLowerCase();
    if (DROP.has(tag)) continue;
    const inner = serialize(node.children);
    if (BLOCKS.has(tag)) {
      if (previousWasBlock) out += '<br>';
      out += inner;
      previousWasBlock = true;
      continue;
    }
    previousWasBlock = false;
    if (tag === 'br') out += '<br>';
    else if (KEEP.has(tag)) out += inner === '' ? '' : `<${tag}>${inner}</${tag}>`;
    else out += inner;
  }
  return out;
}

/** The plain text of field HTML: no tags, entities decoded, spaces collapsed. */
export function toPlainText(html: string): string {
  const text = (nodes: ChildNode[]): string =>
    nodes
      .map((node) => {
        if (isText(node)) return node.data;
        if (!isTag(node) || DROP.has(node.name.toLowerCase())) return '';
        const name = node.name.toLowerCase();
        const inner = text(node.children);
        return name === 'br' || BLOCKS.has(name) ? ` ${inner} ` : inner;
      })
      .join('');
  return decodeHTML(text(parseDocument(html).children))
    .replace(/\s+/g, ' ')
    .trim();
}
