import type { Editor } from '@tiptap/react';
import type { Node as PMNode, Mark as PMMark } from '@tiptap/pm/model';
import { closeHistory } from '@tiptap/pm/history';
export type Suggestion = { id: string; at: string; from: number; to: number; inserted: string; deleted: string; blocks: number };
export function suggestions(doc: PMNode): Suggestion[] {
  const values = new Map<string, Suggestion>();
  const add = (id: string, kind: string, at: string, from: number, to: number, text: string, block = false) => {
    if (!id) return;
    const value = values.get(id) || { id, at, from, to, inserted: '', deleted: '', blocks: 0 };
    value.from = Math.min(value.from, from); value.to = Math.max(value.to, to);
    if (kind === 'delete') value.deleted += text; else value.inserted += text;
    if (block) value.blocks++;
    values.set(id, value);
  };
  doc.descendants((node, pos) => {
    if (node.attrs.reviewId) { add(String(node.attrs.reviewId), String(node.attrs.reviewKind), String(node.attrs.reviewAt), pos, pos + node.nodeSize, node.textContent || node.type.name, true); return false; }
    const mark = node.marks.find(value => value.type.name === 'suggestion');
    if (node.isInline && mark) add(String(mark.attrs.id), String(mark.attrs.kind), String(mark.attrs.at), pos, pos + node.nodeSize, node.textContent || '\ufffc');
  });
  return [...values.values()].sort((a, b) => a.from - b.from);
}
export function resolveSuggestion(editor: Editor, id: string, accept: boolean): void {
  if (!editor.isEditable) return;
  const operations: { from: number; to: number; kind: string; node?: PMNode; mark?: PMMark }[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.attrs.reviewId === id) { operations.push({ from: pos, to: pos + node.nodeSize, kind: node.attrs.reviewKind, node }); return false; }
    const mark = node.marks.find(value => value.type.name === 'suggestion' && value.attrs.id === id);
    if (node.isInline && mark) operations.push({ from: pos, to: pos + node.nodeSize, kind: mark.attrs.kind, mark });
  });
  const tr = closeHistory(editor.state.tr).setMeta('suggestion-resolution', true);
  for (const operation of operations.sort((a, b) => b.from - a.from)) {
    if ((operation.kind === 'delete') === accept) tr.delete(operation.from, operation.to);
    else if (operation.node) tr.setNodeMarkup(operation.from, undefined, { ...operation.node.attrs, reviewId: null, reviewKind: null, reviewAt: null });
    else if (operation.mark) tr.removeMark(operation.from, operation.to, operation.mark);
  }
  if (!tr.doc.childCount) tr.insert(0, editor.schema.nodes.paragraph.create());
  if (tr.docChanged) editor.view.dispatch(tr.scrollIntoView());
}
