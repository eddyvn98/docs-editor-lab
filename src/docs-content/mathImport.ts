import type { JSONContent } from '@tiptap/core';

/** Convert legacy plain-text display math into the native equation block on import/load. */
export function normalizeDelimitedMathBlocks(document: JSONContent): JSONContent {
  if (!Array.isArray(document.content)) return document;
  return { ...document, content: document.content.map(node => {
    if (node.type !== 'paragraph' || node.content?.length !== 1) return node;
    const text = node.content[0];
    if (text.type !== 'text' || text.marks?.length) return node;
    const match = String(text.text || '').match(/^\s*\$\$\s*([\s\S]+?)\s*\$\$\s*$/);
    return match ? { type: 'equation', attrs: { latex: match[1].trim() } } : node;
  }) };
}
