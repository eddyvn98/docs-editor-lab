import type { Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import { NodeSelection, Selection } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';
import type { Node as PMNode } from '@tiptap/pm/model';
import { conversionIds } from './logic';
import type { Action } from './logic';
import { foldingKey } from './HeadingFolding';
import { foldedSpanEnd, hiddenByHeading } from './outlineModel';
import { blankBlock } from './blockCatalog';
import { insertNewBlock } from './insertNewBlock';
import { freshNode } from './docs-ui/blockBatchActions';
function rangeEnd(editor: Editor, pos: number, node: PMNode): number { const state = foldingKey.getState(editor.state); return state ? foldedSpanEnd(pos, node.nodeSize, state.sections, state.ids) : pos + node.nodeSize; }
export function focusBlock(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos); if (!node) return false;
  let caret: number | null = node.isTextblock ? pos + 1 : null;
  if (caret === null) node.descendants((child, offset) => { if (caret === null && child.isTextblock) caret = pos + offset + 2; });
  const selection = caret !== null ? Selection.near(editor.state.doc.resolve(caret)) : NodeSelection.create(editor.state.doc, pos);
  editor.view.dispatch(editor.state.tr.setSelection(selection)); editor.view.focus(); return true;
}
export function deleteBlock(editor: Editor, pos: number): boolean {
  if (!editor.isEditable) return false;
  const node = editor.state.doc.nodeAt(pos); if (!node) return false;
  const resolved = editor.state.doc.resolve(pos), parent = resolved.parent;
  if (parent.childCount === 1 && ['bulletList','orderedList','taskList'].includes(parent.type.name)) return deleteBlock(editor, resolved.before(resolved.depth));
  try {
    const tr = closeHistory(editor.state.tr), end = rangeEnd(editor, pos, node);
    if (parent.childCount === 1) tr.replaceWith(pos, end, editor.schema.nodes.paragraph.create()); else tr.delete(pos, end);
    tr.doc.check(); editor.view.dispatch(tr.scrollIntoView()); editor.view.focus(); return true;
  } catch { return false; }
}
export function duplicateBlock(editor: Editor, pos: number) {
  if (!editor.isEditable) return false;
  const node = editor.state.doc.nodeAt(pos); if (!node) return false;
  const end = rangeEnd(editor, pos, node), copies: PMNode[] = [];
  editor.state.doc.slice(pos, end).content.forEach(child => { const clean = freshNode(editor, child); if (clean) copies.push(clean); });
  if (!copies.length) return false;
  editor.view.dispatch(closeHistory(editor.state.tr).insert(end, copies).scrollIntoView()); return true;
}
export function moveBlock(editor: Editor, from: number, to: number) {
  if (!editor.isEditable) return false;
  const doc = editor.state.doc;
  if (from < 0 || to < 0 || from > doc.content.size || to > doc.content.size) return false;
  const node = doc.nodeAt(from); if (!node) return false;
  const end = rangeEnd(editor, from, node);
  if (from === to || to > from && to <= end || doc.resolve(from).parent !== doc.resolve(to).parent) return false;
  try {
    const content = doc.slice(from, end).content, tr = closeHistory(editor.state.tr).delete(from, end), destination = tr.mapping.map(to, -1);
    tr.insert(destination, content); tr.doc.check(); tr.setSelection(Selection.near(tr.doc.resolve(Math.min(destination + 1, tr.doc.content.size))));
    editor.view.dispatch(tr.scrollIntoView()); return true;
  } catch { return false; }
}
export function moveSibling(editor: Editor, pos: number, direction: -1 | 1) {
  const node = editor.state.doc.nodeAt(pos); if (!node) return false;
  const resolved = editor.state.doc.resolve(pos), parent = resolved.parent, index = resolved.index(), fold = foldingKey.getState(editor.state);
  if (resolved.depth === 0 && fold?.ids.size) {
    const visible: { pos: number; end: number }[] = [];
    parent.forEach((child, at) => { if (!hiddenByHeading(at, fold.sections, fold.ids)) visible.push({ pos: at, end: rangeEnd(editor, at, child) }); });
    const at = visible.findIndex(block => block.pos === pos), adjacent = visible[at + direction];
    return at >= 0 && !!adjacent && moveBlock(editor, pos, direction < 0 ? adjacent.pos : adjacent.end);
  }
  if (direction < 0 && index > 0) return moveBlock(editor, pos, pos - parent.child(index - 1).nodeSize);
  if (direction > 0 && index + 1 < parent.childCount) return moveBlock(editor, pos, pos + node.nodeSize + parent.child(index + 1).nodeSize);
  return false;
}
function textParagraphs(node: PMNode, empty: boolean): JSONContent[] | null {
  if (empty) return [{ type: 'paragraph' }];
  const paragraphs: JSONContent[] = []; let unsafe = false;
  if (node.isTextblock) paragraphs.push({ type: 'paragraph', content: node.content.toJSON() as JSONContent[] });
  else node.descendants(child => {
    if (child.isTextblock) { paragraphs.push({ type: 'paragraph', content: child.content.toJSON() as JSONContent[] }); return false; }
    if (child.isLeaf && !child.isText) unsafe = true; return true;
  });
  return unsafe ? null : paragraphs.length ? paragraphs : [{ type: 'paragraph' }];
}
export function insertBlock(editor: Editor, id: Action, pos: number, slash = false) {
  if (!editor.isEditable) return false;
  const previous = editor.state.doc.nodeAt(pos); if (!previous) return false;
  if (!conversionIds.has(id)) return insertNewBlock(editor, id, 3, 3, pos, true);
  const parts = textParagraphs(previous, slash), draft = blankBlock(id) as JSONContent | null;
  if (!parts || !draft) return false;
  const inline = parts.flatMap((paragraph, index) => [...(index ? [{ type: 'hardBreak' }] : []), ...(paragraph.content || [])]);
  if (id === 'paragraph' || /^h[1-9]$/.test(id)) draft.content = inline;
  else if (['bullet','numbered','task'].includes(id)) draft.content = parts.map(part => ({ type: id === 'task' ? 'taskItem' : 'listItem', attrs: id === 'task' ? { checked: false } : undefined, content: [part] }));
  else if (['quote','callout','toggle'].includes(id)) draft.content = parts;
  else if (id === 'code') { const text = slash ? '' : previous.textBetween(0, previous.content.size, '\n', '\n'); draft.content = text ? [{ type: 'text', text }] : undefined; }
  try {
    const node = editor.schema.nodeFromJSON({ ...draft, attrs: { ...previous.attrs, ...draft.attrs, blockId: previous.attrs.blockId } }); node.check();
    const tr = closeHistory(editor.state.tr).replaceWith(pos, pos + previous.nodeSize, node); tr.doc.check(); editor.view.dispatch(tr.scrollIntoView()); return focusBlock(editor, pos);
  } catch { return false; }
}
export function applyBlockAction(editor: Editor, id: Action, pos: number, cellPos?: number) {
  if (!editor.isEditable) return false;
  if (id === 'toggle-task') { const node = editor.state.doc.nodeAt(pos); if (node?.type.name !== 'taskItem') return false; editor.view.dispatch(closeHistory(editor.state.tr).setNodeMarkup(pos, undefined, { ...node.attrs, checked: !node.attrs.checked })); return true; }
  if (id === 'duplicate') return duplicateBlock(editor, pos);
  if (id === 'delete') return deleteBlock(editor, pos);
  if (id === 'move-up' || id === 'move-down') return moveSibling(editor, pos, id === 'move-up' ? -1 : 1);
  if (id === 'insert-below') return insertNewBlock(editor, 'paragraph', 3, 3, pos);
  if (conversionIds.has(id) || blankBlock(id)) return insertBlock(editor, id, pos);
  // Preserve CellSelection; collapsing it here would make merging impossible.
  if (cellPos !== undefined) { if (!('$anchorCell' in editor.state.selection)) editor.commands.setTextSelection(cellPos); } else focusBlock(editor, pos);
  const chain = editor.chain().focus();
  switch (id) {
    case 'align-left': return chain.setTextAlign('left').run();
    case 'align-center': return chain.setTextAlign('center').run();
    case 'align-right': return chain.setTextAlign('right').run();
    case 'indent': return chain.sinkListItem(editor.isActive('taskItem') ? 'taskItem' : 'listItem').run();
    case 'outdent': return chain.liftListItem(editor.isActive('taskItem') ? 'taskItem' : 'listItem').run();
    case 'row-add': return chain.addRowAfter().run();
    case 'row-before': return chain.addRowBefore().run();
    case 'row-delete': return chain.deleteRow().run();
    case 'col-add': return chain.addColumnAfter().run();
    case 'col-before': return chain.addColumnBefore().run();
    case 'col-delete': return chain.deleteColumn().run();
    case 'merge-cells': return chain.mergeCells().run();
    case 'split-cell': return chain.splitCell().run();
    case 'header-row': return chain.toggleHeaderRow().run();
    case 'header-column': return chain.toggleHeaderColumn().run();
    case 'header-cell': return chain.toggleHeaderCell().run();
    case 'table-delete': return chain.deleteTable().run();
    default: return false;
  }
}
