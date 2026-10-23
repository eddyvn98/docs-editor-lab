export type InsertDraft = { type: string; attrs?: Record<string, unknown>; content?: InsertDraft[]; text?: string };
const paragraph = (): InsertDraft => ({ type: 'paragraph' });
export function tableDimensions(rows: number, columns: number): { rows: number; columns: number } {
  const bound = (n: number) => Number.isFinite(n) ? Math.max(1, Math.min(20, Math.trunc(n))) : 3;
  return { rows: bound(rows), columns: bound(columns) };
}
export function blankBlock(id: string, rows = 3, columns = 3): InsertDraft | null {
  if (id === 'paragraph') return paragraph();
  if (/^h[123]$/.test(id)) return { type: 'heading', attrs: { level: Number(id[1]) } };
  if (['bullet', 'numbered', 'task'].includes(id)) return { type: id === 'task' ? 'taskList' : id === 'bullet' ? 'bulletList' : 'orderedList',
    content: [{ type: id === 'task' ? 'taskItem' : 'listItem', attrs: id === 'task' ? { checked: false } : undefined, content: [paragraph()] }] };
  if (id === 'quote' || id === 'callout') return { type: id === 'quote' ? 'blockquote' : 'callout', content: [paragraph()] };
  if (id === 'code') return { type: 'codeBlock' };
  if (id === 'divider') return { type: 'horizontalRule' };
  if (id === 'columns') return { type: 'columns', content: [0, 1].map(() => ({ type: 'column', content: [paragraph()] })) };
  if (id === 'image') return { type: 'image', attrs: { src: '/editor-sample.svg', alt: 'Document illustration', width: '80%', caption: 'Click to replace this image' } };
  if (id === 'table') {
    const size = tableDimensions(rows, columns);
    return { type: 'table', content: Array.from({ length: size.rows }, (_, row) => ({ type: 'tableRow',
      content: Array.from({ length: size.columns }, () => ({ type: row === 0 ? 'tableHeader' : 'tableCell', content: [paragraph()] })) })) };
  }
  return null;
}
export const blockDescriptions: Record<string, string> = {
  paragraph: 'A plain paragraph', h1: 'Large section heading', h2: 'Medium section heading', h3: 'Small section heading',
  bullet: 'An unordered list', numbered: 'An ordered list', task: 'A checklist with checkboxes', quote: 'A quotation with an accent border',
  callout: 'Highlight a note or warning', code: 'A monospaced code block', divider: 'A horizontal separator',
  image: 'Insert an image placeholder, then replace or upload', table: 'A grid with a header row', columns: 'Two editable columns, stacked on narrow screens',
};
