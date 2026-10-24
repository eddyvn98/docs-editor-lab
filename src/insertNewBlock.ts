import type { Editor } from '@tiptap/react';
import { Selection } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';
import { blankBlock } from './blockCatalog';
import { foldingKey } from './HeadingFolding';
import { foldedSpanEnd } from './outlineModel';
/** Preserve existing content and insert a complete block as one undoable edit. */
export function insertNewBlock(editor: Editor, id: string, rows = 3, columns = 3, afterPos?: number, reuseTarget = false): boolean {
  if (!editor.isEditable) return false;
  const draft = blankBlock(id, rows, columns, true); if (!draft) return false;
  const { selection, doc } = editor.state;
  if (id === 'synced' && Array.from({ length: selection.$from.depth }, (_, i) => selection.$from.node(i + 1).type.name).includes('syncedBlock')) return false;
  if (id === 'inline-equation' && afterPos === undefined && selection.$to.parent.isTextblock) {
    const node = editor.schema.nodeFromJSON(draft), tr = closeHistory(editor.state.tr).insert(selection.to, node);
    tr.setSelection(Selection.near(tr.doc.resolve(selection.to + node.nodeSize))); editor.view.dispatch(tr); editor.view.focus(); return true;
  }
  const pos = afterPos ?? (selection.$from.depth ? selection.$from.before(1) : selection.from);
  if (pos < 0 || pos > doc.content.size) return false;
  const current = doc.nodeAt(pos); if (afterPos !== undefined && !current) return false;
  const reuse = (afterPos === undefined || reuseTarget) && current?.type.name === 'paragraph' && current.content.size === 0;
  const fold = foldingKey.getState(editor.state), end = current && fold ? foldedSpanEnd(pos, current.nodeSize, fold.sections, fold.ids) : pos + (current?.nodeSize || 0);
  const at = reuse ? pos : Math.min(doc.content.size, end);
  try {
    let node = editor.schema.nodeFromJSON(draft); node.check();
    if (node.isInline) node = editor.schema.nodes.paragraph.create(null, node);
    const inList = afterPos !== undefined && current && ['listItem','taskItem'].includes(current.type.name);
    if (inList) { const paragraph = editor.schema.nodes.paragraph.create(); node = current.type.create(current.type.name === 'taskItem' ? { checked: false } : null, node.type.name === 'paragraph' ? [node] : [paragraph, node]); }
    const trailing = !inList && (node.isAtom || ['table','columns','imageGallery','syncedBlock'].includes(node.type.name));
    const tr = closeHistory(editor.state.tr).replaceWith(at, reuse ? at + current!.nodeSize : at, trailing ? [node, editor.schema.nodes.paragraph.create()] : node);
    tr.doc.check(); let caret = node.isTextblock ? at + 1 : null;
    node.descendants((child, offset) => { if (caret === null && child.isTextblock) caret = at + offset + 2; });
    tr.setSelection(Selection.near(tr.doc.resolve(Math.min(caret ?? at + node.nodeSize + 1, tr.doc.content.size))));
    editor.view.dispatch(tr.scrollIntoView()); editor.view.focus(); return true;
  } catch { return false; }
}
