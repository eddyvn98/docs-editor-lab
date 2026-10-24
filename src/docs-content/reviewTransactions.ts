import { Fragment } from '@tiptap/pm/model';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Selection } from '@tiptap/pm/state';
import type { EditorState } from '@tiptap/pm/state';
function rootRange(doc: PMNode, from: number, to: number) {
  if (from === to && doc.resolve(from).depth === 0) return { from, to };
  const start = doc.resolve(Math.min(from, doc.content.size)), end = doc.resolve(Math.min(Math.max(from, to), doc.content.size));
  return { from: start.depth ? start.before(1) : from, to: end.depth ? end.after(1) : to };
}
function rootNodes(doc: PMNode, from: number, to: number): PMNode[] { const values: PMNode[] = []; doc.nodesBetween(from, to, (node, _pos, parent) => { if (parent === doc) values.push(node); return false; }); return values; }
function sameContent(a: PMNode, b: PMNode): boolean {
  if (a.type !== b.type || a.text !== b.text || a.childCount !== b.childCount || a.marks.length !== b.marks.length || !a.marks.every((mark, index) => mark.eq(b.marks[index]))) return false;
  for (let i = 0; i < a.childCount; i++) if (!sameContent(a.child(i), b.child(i))) return false;
  return a.marks.length === b.marks.length;
}
/** Keep proposed edits in the document. Accept/reject and undo operate on persisted marks/attrs. */
export function annotateChange(before: PMNode, state: EditorState) {
  const after = state.doc, start = before.content.findDiffStart(after.content), end = before.content.findDiffEnd(after.content);
  if (start === null || !end || sameContent(before, after)) return null;
  const overlap = start - Math.min(end.a, end.b), a = end.a + Math.max(0, overlap), b = end.b + Math.max(0, overlap);
  const oldStart = before.resolve(start), oldEnd = before.resolve(a), newStart = after.resolve(start), newEnd = after.resolve(b);
  const tr = state.tr.setMeta('suggestion-annotation', true), type = state.schema.marks.suggestion;
  type UUID = ReturnType<typeof crypto.randomUUID>;
  let id: UUID = crypto.randomUUID(), at = new Date().toISOString();
  const pendingRoot = (position: typeof oldStart) => position.depth ? position.node(1) : null;
  const previousRoot = pendingRoot(oldStart), nextRoot = pendingRoot(newStart);
  // Editing an already-proposed block updates that proposal, rather than nesting revisions.
  if (previousRoot?.attrs.reviewKind === 'insert' && previousRoot.attrs.reviewId === nextRoot?.attrs.reviewId && oldStart.index(0) === oldEnd.index(0) && newStart.index(0) === newEnd.index(0)) return null;
  if (oldStart.parent.isTextblock && oldStart.sameParent(oldEnd) && newStart.parent.isTextblock && newStart.sameParent(newEnd) && oldStart.parent.type === newStart.parent.type && type && oldStart.parent.type.allowsMarkType(type) && newStart.parent.type.allowsMarkType(type)) {
    const old = before.slice(start, a).content, removed: PMNode[] = [];
    const nearby = old.firstChild?.marks.find(mark => mark.type === type && mark.attrs.kind === 'insert') || newStart.nodeBefore?.marks.find(mark => mark.type === type && mark.attrs.kind === 'insert');
    if (nearby) { id = String(nearby.attrs.id) as UUID; at = String(nearby.attrs.at); }
    old.forEach(node => {
      const pending = node.marks.find(mark => mark.type === type);
      if (pending?.attrs.kind === 'insert') return;
      removed.push(pending?.attrs.kind === 'delete' ? node : node.mark(type.create({ id, kind: 'delete', at }).addToSet(node.marks)));
    });
    const fragment = Fragment.from(removed);
    if (fragment.size) tr.insert(start, fragment);
    if (b > start) tr.addMark(start + fragment.size, b + fragment.size, type.create({ id, kind: 'insert', at }));
    if (!tr.docChanged) return null;
    tr.setSelection(state.selection.map(tr.doc, tr.mapping)); return tr;
  }
  const oldRange = rootRange(before, start, a), newRange = rootRange(after, start, b);
  const oldNodes = rootNodes(before, oldRange.from, oldRange.to), newNodes = rootNodes(after, newRange.from, newRange.to);
  // Every root block in the schema has these optional review attributes.
  if ([...oldNodes, ...newNodes].some(node => !Object.prototype.hasOwnProperty.call(node.attrs, 'reviewId'))) return null;
  const previous = oldNodes.find(node => node.attrs.reviewKind === 'insert');
  if (previous) { id = String(previous.attrs.reviewId) as UUID; at = String(previous.attrs.reviewAt); }
  const deleted = oldNodes.filter(node => node.attrs.reviewKind !== 'insert').map(node => node.attrs.reviewKind === 'delete' ? node : node.type.create({ ...node.attrs, reviewId: id, reviewKind: 'delete', reviewAt: at }, node.content, node.marks));
  const inserted = newNodes.map(node => node.type.create({ ...node.attrs, reviewId: id, reviewKind: 'insert', reviewAt: at }, node.content, node.marks));
  const keptSize = deleted.reduce((sum, node) => sum + node.nodeSize, 0), relative = Math.max(0, state.selection.head - newRange.from);
  tr.replaceWith(newRange.from, newRange.to, [...deleted, ...inserted]);
  tr.setSelection(Selection.near(tr.doc.resolve(Math.min(tr.doc.content.size, newRange.from + keptSize + relative))));
  return tr.docChanged ? tr : null;
}
