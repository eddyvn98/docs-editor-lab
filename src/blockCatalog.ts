export type InsertDraft = { type: string; attrs?: Record<string, unknown>; content?: InsertDraft[]; text?: string };
const paragraph = (): InsertDraft => ({ type: 'paragraph' });
export function tableDimensions(rows: number, columns: number): { rows: number; columns: number } {
  const bound = (n: number) => Number.isFinite(n) ? Math.max(1, Math.min(20, Math.trunc(n))) : 3; return { rows: bound(rows), columns: bound(columns) };
}
export function blankBlock(id: string, rows = 3, columns = 3): InsertDraft | null {
  if (id === 'paragraph') return paragraph();
  if (/^h[1-9]$/.test(id)) return { type: 'heading', attrs: { level: Number(id[1]) } };
  if (['bullet','numbered','task'].includes(id)) return { type: id === 'task' ? 'taskList' : id === 'bullet' ? 'bulletList' : 'orderedList', content: [{ type: id === 'task' ? 'taskItem' : 'listItem', attrs: id === 'task' ? { checked: false } : undefined, content: [paragraph()] }] };
  if (id === 'quote' || id === 'callout') return { type: id === 'quote' ? 'blockquote' : 'callout', content: [paragraph()] };
  if (id === 'toggle') return { type: 'toggleBlock', attrs: { title: 'Details', open: true }, content: [paragraph()] };
  if (id === 'sheets') return { type: 'inlineSheet' }; // Read/insert compatibility for previously saved documents; not in the Docs picker.
  if (id === 'toc') return { type: 'docsToc' };
  if (id === 'timeline') return { type: 'docsTimeline' };
  if (id === 'mermaid') return { type: 'docsMermaid' };
  if (id === 'page-break') return { type: 'pageBreak' };
  if (id === 'code') return { type: 'codeBlock' };
  if (id === 'divider') return { type: 'horizontalRule' };
  if (['columns','columns-3','columns-4'].includes(id)) return { type: 'columns', content: Array.from({ length: id === 'columns' ? 2 : Number(id.at(-1)) }, () => ({ type: 'column', content: [paragraph()] })) };
  if (id === 'image') return { type: 'image', attrs: { src: '/editor-sample.svg', alt: 'Document illustration', width: '80%', caption: 'Click to replace this image' } };
  if (id === 'image-gallery') return { type: 'imageGallery' };
  if (['file','audio','video','web-card'].includes(id)) return { type: 'mediaBlock', attrs: { kind: id === 'web-card' ? 'web' : id } };
  if (id === 'equation' || id === 'inline-equation') return { type: id === 'equation' ? 'equation' : 'inlineEquation' };
  if (id === 'synced') return { type: 'syncedBlock', attrs: { syncId: crypto.randomUUID() }, content: [paragraph()] };
  if (id === 'table') { const size = tableDimensions(rows, columns); return { type: 'table', content: Array.from({ length: size.rows }, (_, row) => ({ type: 'tableRow', content: Array.from({ length: size.columns }, () => ({ type: row === 0 ? 'tableHeader' : 'tableCell', content: [paragraph()] })) })) }; }
  return null;
}
export const blockDescriptions: Record<string, string> = {
  paragraph:'A plain paragraph', ...Object.fromEntries([1,2,3,4,5,6,7,8,9].map(level => [`h${level}`,`Heading level ${level}`])),
  bullet:'An unordered list',numbered:'An ordered list',task:'A checklist with checkboxes',quote:'A quotation',callout:'Highlight a note or warning',toggle:'Collapsible details',
  image:'Insert, upload or replace an image','image-gallery':'Arrange images in rows or a grid',file:'Upload a downloadable attachment',audio:'Upload or link an audio file',video:'Upload or link a video file','web-card':'A titled link with a description',
  table:'Editable table with row and column controls',columns:'Two columns with draggable dividers','columns-3':'Three resizable columns','columns-4':'Four resizable columns',divider:'A horizontal separator','page-break':'Start a new page when printing',
  code:'Source code with language and wrap controls',equation:'Display a mathematical equation','inline-equation':'Math inside a sentence',toc:'Live document headings',timeline:'Editable event timeline',mermaid:'Diagram source and preview',synced:'Linked content within this document',
  templates:'Reuse blocks saved in this browser','templates-gallery':'Browse document templates',
};
export function blockGroup(id: string): string {
  if (id.startsWith('template')) return 'Templates';
  if (['image','image-gallery','file','audio','video','web-card'].includes(id)) return 'Media';
  if (['table','columns','columns-3','columns-4','divider','page-break'].includes(id)) return 'Layout';
  if (['code','equation','inline-equation','toc','timeline','mermaid','synced'].includes(id)) return 'Advanced';
  return 'Basic';
}
