import type { Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import { NodeSelection, Selection } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { Action } from './logic';
import { foldingKey } from './HeadingFolding';
import { foldedSpanEnd, hiddenByHeading } from './outlineModel';

function rangeEnd(editor: Editor, pos: number, node: PMNode): number {
  const state = foldingKey.getState(editor.state);
  return state ? foldedSpanEnd(pos, node.nodeSize, state.sections, state.ids) : pos + node.nodeSize;
}
export function focusBlock(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos); if (!node) return false;
  let caret: number | null = node.isTextblock ? pos + 1 : null;
  if (caret === null) node.descendants((child, offset) => {
    if (caret === null && child.isTextblock) caret = pos + offset + 2;
  });
  const selection = caret !== null ? Selection.near(editor.state.doc.resolve(caret)) : NodeSelection.create(editor.state.doc, pos);
  editor.view.dispatch(editor.state.tr.setSelection(selection)); editor.view.focus(); return true;
}
export function deleteBlock(editor: Editor, pos: number): boolean {
  const node = editor.state.doc.nodeAt(pos); if (!node) return false;
  const resolved = editor.state.doc.resolve(pos), parent = resolved.parent;
  if (parent.childCount === 1 && ['bulletList', 'orderedList', 'taskList'].includes(parent.type.name)) {
    return deleteBlock(editor, resolved.before(resolved.depth));
  }
  try {
    const tr = editor.state.tr;
    if (parent.childCount === 1) tr.replaceWith(pos, pos + node.nodeSize, editor.schema.nodes.paragraph.create());
    else tr.delete(pos, pos + node.nodeSize);
    editor.view.dispatch(tr.scrollIntoView()); editor.view.focus(); return true;
  } catch { return false; }
}
function freshCopy(node: JSONContent): JSONContent {
  const attrs = node.attrs ? { ...node.attrs, blockId: null } : undefined;
  return { ...node, attrs, marks: node.marks?.filter(mark => mark.type !== 'comment'), content: node.content?.map(freshCopy) };
}
export function duplicateBlock(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos); if (!node) return false;
  const end = rangeEnd(editor, pos, node), copies: PMNode[] = [];
  editor.state.doc.slice(pos, end).content.forEach(child => copies.push(editor.schema.nodeFromJSON(freshCopy(child.toJSON() as JSONContent))));
  editor.view.dispatch(editor.state.tr.insert(end, copies).scrollIntoView());
  return true;
}
export function moveBlock(editor: Editor, from: number, to: number) {
  const doc = editor.state.doc;
  if (from < 0 || to < 0 || from > doc.content.size || to > doc.content.size) return false;
  const node = doc.nodeAt(from); if (!node) return false;
  const end = rangeEnd(editor, from, node);
  if (from === to || (to > from && to <= end)) return false;
  if (doc.resolve(from).parent !== doc.resolve(to).parent) return false;
  try {
    const content = doc.slice(from, end).content;
    const tr = editor.state.tr.delete(from, end);
    const destination = tr.mapping.map(to, -1);
    tr.insert(destination, content); tr.doc.check();
    tr.setSelection(Selection.near(tr.doc.resolve(Math.min(destination + 1, tr.doc.content.size))));
    editor.view.dispatch(tr.scrollIntoView()); return true;
  } catch { return false; }
}
export function moveSibling(editor: Editor, pos: number, direction: -1 | 1) {
  const node = editor.state.doc.nodeAt(pos); if (!node) return false;
  const resolved = editor.state.doc.resolve(pos), parent = resolved.parent, index = resolved.index();
  const fold = foldingKey.getState(editor.state);
  if (resolved.depth === 0 && fold?.ids.size) {
    const visible: { pos: number; end: number }[] = [];
    parent.forEach((child, at) => {
      if (!hiddenByHeading(at, fold.sections, fold.ids)) visible.push({ pos: at, end: rangeEnd(editor, at, child) });
    });
    const at = visible.findIndex(block => block.pos === pos), adjacent = visible[at + direction];
    if (at < 0 || !adjacent) return false;
    return moveBlock(editor, pos, direction < 0 ? adjacent.pos : adjacent.end);
  }
  if (direction < 0 && index > 0) return moveBlock(editor, pos, pos - parent.child(index - 1).nodeSize);
  if (direction > 0 && index + 1 < parent.childCount) return moveBlock(editor, pos, pos + node.nodeSize + parent.child(index + 1).nodeSize);
  return false;
}
function textParagraphs(node: PMNode, empty: boolean): JSONContent[] | null {
  if (empty) return [{ type: 'paragraph' }];
  const paragraphs: JSONContent[] = [];
  let unsafe = false;
  if (node.isTextblock) paragraphs.push({ type: 'paragraph', content: node.content.toJSON() as JSONContent[] });
  else node.descendants(child => {
    if (child.isTextblock) { paragraphs.push({ type: 'paragraph', content: child.content.toJSON() as JSONContent[] }); return false; }
    if (child.isLeaf && !child.isText) unsafe = true;
    return true;
  });
  return unsafe ? null : paragraphs.length ? paragraphs : [{ type: 'paragraph' }];
}
export function insertBlock(editor: Editor, id: Action, pos: number, slash = false) {
  const previous = editor.state.doc.nodeAt(pos); if (!previous) return false;
  const paragraphs = textParagraphs(previous, slash);
  const textTypes = ['paragraph', 'h1', 'h2', 'h3', 'bullet', 'numbered', 'task', 'quote', 'callout', 'code'];
  if (textTypes.includes(id) && !paragraphs) return false;
  const parts = paragraphs || [{ type: 'paragraph' }];
  const inline = parts.flatMap((p, i) => [...(i ? [{ type: 'hardBreak' }] : []), ...(p.content || [])]);
  let content: JSONContent;
  switch (id) {
    case 'paragraph': content = { type: 'paragraph', content: inline }; break;
    case 'h1': case 'h2': case 'h3': content = { type: 'heading', attrs: { level: Number(id[1]) }, content: inline }; break;
    case 'bullet': case 'numbered': case 'task':
      content = { type: id === 'task' ? 'taskList' : id === 'bullet' ? 'bulletList' : 'orderedList',
        content: parts.map(p => ({ type: id === 'task' ? 'taskItem' : 'listItem', attrs: id === 'task' ? { checked: false } : undefined, content: [p] })) }; break;
    case 'quote': case 'callout': content = { type: id === 'quote' ? 'blockquote' : 'callout', content: parts }; break;
    case 'code': {
      const text = slash ? '' : previous.textBetween(0, previous.content.size, '\n', '\n');
      content = { type: 'codeBlock', content: text ? [{ type: 'text', text }] : undefined }; break;
    }
    case 'divider': content = { type: 'horizontalRule' }; break;
    case 'image': content = { type: 'image', attrs: { src: '/editor-sample.svg', alt: 'Sample document illustration', width: '80%', caption: 'Replace with your image' } }; break;
    case 'table': content = { type: 'table', content: Array.from({ length: 3 }, (_, row) => ({ type: 'tableRow', content: Array.from({ length: 3 }, () => ({ type: row === 0 ? 'tableHeader' : 'tableCell', content: [{ type: 'paragraph' }] })) })) }; break;
    case 'columns': content = { type: 'columns', content: [0, 1].map(() => ({ type: 'column', content: [{ type: 'paragraph' }] })) }; break;
    default: return false;
  }
  try {
    const block = editor.schema.nodeFromJSON({ ...content, attrs: { ...content.attrs, blockId: previous.attrs.blockId } });
    block.check();
    const trailing = ['image', 'table', 'columns', 'horizontalRule'].includes(block.type.name);
    const tr = editor.state.tr.replaceWith(pos, pos + previous.nodeSize,
      trailing ? [block, editor.schema.nodes.paragraph.create()] : block);
    editor.view.dispatch(tr.scrollIntoView());
    return focusBlock(editor, trailing ? pos + block.nodeSize : pos);
  } catch { return false; }
}
export function applyBlockAction(editor: Editor, id: Action, pos: number, cellPos?: number) {
  if (id === 'toggle-task') {
    const node = editor.state.doc.nodeAt(pos);
    if (node?.type.name !== 'taskItem') return false;
    editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, checked: !node.attrs.checked }));
    return true;
  }
  if (id === 'duplicate') return duplicateBlock(editor, pos);
  if (id === 'delete') return deleteBlock(editor, pos);
  if (id === 'move-up' || id === 'move-down') return moveSibling(editor, pos, id === 'move-up' ? -1 : 1);
  if (id === 'insert-below') {
    const node = editor.state.doc.nodeAt(pos); if (!node) return false;
    const after = pos + node.nodeSize;
    const content = node.type.name === 'taskItem' ? { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] } : { type: 'paragraph' };
    return editor.chain().insertContentAt(after, content).focus(after + (node.type.name === 'taskItem' ? 2 : 1)).run();
  }
  if (['paragraph', 'h1', 'h2', 'h3', 'bullet', 'numbered', 'task', 'quote', 'callout', 'code', 'divider', 'image', 'table', 'columns'].includes(id)) return insertBlock(editor, id, pos);
  if (cellPos !== undefined) {
    if (!('$anchorCell' in editor.state.selection)) editor.commands.setTextSelection(cellPos);
  } else focusBlock(editor, pos);
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
