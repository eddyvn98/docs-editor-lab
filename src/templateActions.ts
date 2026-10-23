import type { Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import { Selection } from '@tiptap/pm/state';
import { foldingKey } from './HeadingFolding';
import { foldedSpanEnd } from './outlineModel';
import { cleanTemplate } from './templateModel';
import type { TemplateNode } from './templateModel';
import { validateDocument } from './contentIO';

export function captureTemplate(editor: Editor, pos?: number): TemplateNode[] {
  const { selection, doc } = editor.state;
  if (pos !== undefined) {
    const node = doc.nodeAt(pos); if (!node) throw new Error('This block no longer exists.');
    const fold = foldingKey.getState(editor.state);
    const end = fold ? foldedSpanEnd(pos, node.nodeSize, fold.sections, fold.ids) : pos + node.nodeSize;
    let content = doc.slice(pos, end).content.toJSON() as TemplateNode[];
    if (node.type.name === 'taskItem' || node.type.name === 'listItem') {
      content = [{ type: node.type.name === 'taskItem' ? 'taskList' : 'bulletList', content }];
    }
    return content.map(node => cleanTemplate(node));
  }
  const nodes: TemplateNode[] = [];
  doc.forEach((node, at) => {
    if (selection.empty ? selection.from >= at && selection.from < at + node.nodeSize : at < selection.to && at + node.nodeSize > selection.from) {
      nodes.push(cleanTemplate(node.toJSON() as TemplateNode));
    }
  });
  if (!nodes.length) throw new Error('Select a block to save.');
  return nodes;
}
export function insertTemplate(editor: Editor, content: TemplateNode[], afterPos?: number): boolean {
  if (!editor.isEditable) return false;
  const valid = validateDocument({ type: 'doc', content: content.map(node => cleanTemplate(node)) }, editor);
  let nodes = (valid.content || []).map(node => editor.schema.nodeFromJSON(node as JSONContent));
  if (!nodes.length) return false;
  const { selection, doc } = editor.state;
  const pos = afterPos ?? (selection.$from.depth ? selection.$from.before(1) : selection.from);
  if (pos < 0 || pos > doc.content.size) return false;
  const current = doc.nodeAt(pos), empty = afterPos === undefined && current?.type.name === 'paragraph' && current.content.size === 0;
  if (afterPos !== undefined && !current) return false;
  if (afterPos !== undefined && current && ['listItem', 'taskItem'].includes(current.type.name)) {
    nodes = nodes.map(node => current.type.create(current.type.name === 'taskItem' ? {checked:false} : null,
      node.type.name === 'paragraph' ? [node] : [editor.schema.nodes.paragraph.create(), node]));
  }
  const fold = foldingKey.getState(editor.state);
  const end = current && fold ? foldedSpanEnd(pos, current.nodeSize, fold.sections, fold.ids) : pos + (current?.nodeSize || 0);
  const at = empty ? pos : end;
  const tr = editor.state.tr.replaceWith(at, empty ? at + current!.nodeSize : at, nodes);
  tr.doc.check();
  tr.setSelection(Selection.near(tr.doc.resolve(Math.min(at + 1, tr.doc.content.size))));
  editor.view.dispatch(tr.scrollIntoView()); editor.view.focus(); return true;
}
