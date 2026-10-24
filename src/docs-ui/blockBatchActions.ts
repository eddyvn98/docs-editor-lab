import type { Editor } from '@tiptap/react';
import { Fragment } from '@tiptap/pm/model';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Selection } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';
import { BlockRangeSelection, rootBlock } from './blockSelection';

export function selectBlocks(editor: Editor, pos: number, extend = false) {
  const block = rootBlock(editor.state.doc, pos); if (!block) return;
  const current = editor.state.selection;
  const from = extend ? Math.min(current.from, block.from) : block.from;
  const to = extend ? Math.max(current.to, block.to) : block.to;
  editor.view.dispatch(editor.state.tr.setSelection(BlockRangeSelection.create(editor.state.doc, from, to)));
  editor.view.focus();
}
export function selectedBlocks(editor: Editor): PMNode[] {
  const { selection, doc } = editor.state;
  if (!(selection instanceof BlockRangeSelection)) return [];
  const nodes: PMNode[] = [];
  doc.nodesBetween(selection.from, selection.to, (node, _pos, parent) => {
    if (parent === doc) nodes.push(node);
    return false;
  });
  return nodes;
}
export function moveBlockRange(editor: Editor, from: number, to: number, destination: number): boolean {
  if (!editor.isEditable || destination >= from && destination <= to) return false;
  const { doc } = editor.state;
  if ([from, to, destination].some(pos => pos < 0 || pos > doc.content.size || doc.resolve(pos).depth !== 0)) return false;
  const content = doc.slice(from, to).content;
  const tr = closeHistory(editor.state.tr).delete(from, to);
  const at = tr.mapping.map(destination, destination > to ? -1 : 1);
  tr.insert(at, content); tr.doc.check();
  tr.setSelection(BlockRangeSelection.create(tr.doc, at, at + content.size));
  editor.view.dispatch(tr.scrollIntoView()); editor.view.focus(); return true;
}
export function freshNode(editor: Editor, node: PMNode): PMNode | null {
  if (node.attrs.reviewKind === 'delete') return null;
  if (node.isText && node.marks.some(mark => mark.type.name === 'suggestion' && mark.attrs.kind === 'delete')) return null;
  const marks = node.marks.filter(mark => !['comment', 'suggestion'].includes(mark.type.name));
  if (node.isText) return editor.schema.text(node.text || '', marks);
  const children: PMNode[] = [];
  node.forEach(child => { const clean = freshNode(editor, child); if (clean) children.push(clean); });
  const attrs: Record<string, unknown> = { ...node.attrs, blockId: null, reviewId: null, reviewKind: null, reviewAt: null };
  // Copies are independent unless the user explicitly chooses a synced copy.
  if (node.type.name === 'syncedBlock') attrs.syncId = crypto.randomUUID();
  return node.type.createAndFill(attrs, Fragment.from(children), marks);
}
export function batchAction(editor: Editor, action: 'duplicate' | 'delete' | 'up' | 'down' | 'columns' | 'gallery'): boolean {
  if (!editor.isEditable) return false;
  const selected = selectedBlocks(editor); if (!selected.length) return false;
  const { from, to } = editor.state.selection, { doc } = editor.state;
  if (action === 'up' || action === 'down') {
    const $from = doc.resolve(from), $to = doc.resolve(to);
    const adjacent = action === 'up' ? $from.nodeBefore : $to.nodeAfter;
    if (!adjacent) return false;
    return moveBlockRange(editor, from, to, action === 'up' ? from - adjacent.nodeSize : to + adjacent.nodeSize);
  }
  const tr = closeHistory(editor.state.tr);
  if (action === 'delete') {
    tr.delete(from, to);
    if (!tr.doc.childCount) tr.insert(0, editor.schema.nodes.paragraph.create());
    tr.setSelection(Selection.near(tr.doc.resolve(Math.min(from, tr.doc.content.size))));
  } else if (action === 'duplicate') {
    const content = Fragment.from(selected.map(node => freshNode(editor, node)).filter((node): node is PMNode => !!node));
    if (!content.size) return false;
    tr.insert(to, content).setSelection(BlockRangeSelection.create(tr.doc, to, to + content.size));
  } else {
    let wrapper: PMNode;
    if (action === 'gallery') {
      if (selected.length > 12 || selected.some(node => node.type.name !== 'image')) return false;
      wrapper = editor.schema.nodes.imageGallery.create({ columns: Math.min(3, selected.length) }, selected);
    } else {
      const split = Math.max(1, Math.ceil(selected.length / 2));
      const paragraph = editor.schema.nodes.paragraph.create();
      wrapper = editor.schema.nodes.columns.create(null, [
        editor.schema.nodes.column.create(null, selected.slice(0, split)),
        editor.schema.nodes.column.create(null, selected.slice(split).length ? selected.slice(split) : [paragraph]),
      ]);
    }
    tr.replaceWith(from, to, wrapper).setSelection(BlockRangeSelection.create(tr.doc, from, from + wrapper.nodeSize));
  }
  tr.doc.check(); editor.view.dispatch(tr.scrollIntoView()); editor.view.focus(); return true;
}
