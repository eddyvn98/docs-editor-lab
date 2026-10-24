import type { Node as PMNode } from '@tiptap/pm/model';
export type SearchOptions = { caseSensitive?: boolean; wholeWord?: boolean };
export function documentMatches(doc: PMNode, query: string, options: SearchOptions = {}) {
  const found: { from: number; to: number }[] = [];
  if (!query || query.length > 500) return found;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(escaped, options.caseSensitive ? 'gu' : 'giu');
  const word = /[\p{L}\p{N}_]/u;
  doc.descendants((node, pos) => {
    if (!node.isTextblock || found.length >= 5000) return;
    // Leaf placeholders preserve ProseMirror offsets; marks do not split a match.
    const text = node.textBetween(0, node.content.size, '', '\ufffc');
    pattern.lastIndex = 0;
    for (let match = pattern.exec(text); match && found.length < 5000; match = pattern.exec(text)) {
      const at = match.index, end = at + match[0].length;
      if (options.wholeWord && (word.test(text[at - 1] || '') || word.test(text[end] || ''))) continue;
      found.push({ from: pos + 1 + at, to: pos + 1 + end });
    }
    return false;
  });
  return found;
}
