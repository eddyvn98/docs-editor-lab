import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { Selection } from "@tiptap/pm/state";

export function insertFeatureBlocks(editor: Editor, content: JSONContent[], append = false): boolean {
  if (!editor.isEditable || !content.length) return false;
  const blocks = content.map(item => editor.schema.nodeFromJSON(item));
  blocks.forEach(node => node.check());
  const { doc, selection } = editor.state;
  const top = selection.$from.depth ? selection.$from.before(1) : selection.from;
  const current = doc.nodeAt(top);
  const empty = !append && current?.type.name === "paragraph" && current.content.size === 0;
  const from = append ? doc.content.size : empty ? top : top + (current?.nodeSize || 0);
  const to = empty ? top + current!.nodeSize : from;
  const trailing = blocks[blocks.length - 1].isAtom ? [editor.schema.nodes.paragraph.create()] : [];
  const tr = editor.state.tr.replaceWith(from, to, [...blocks, ...trailing]);
  tr.doc.check();
  tr.setSelection(Selection.near(tr.doc.resolve(Math.min(from + 1, tr.doc.content.size))));
  editor.view.dispatch(tr.scrollIntoView()); editor.view.focus(); return true;
}
export function clearTextFormatting(editor: Editor) {
  if (!editor.isEditable) return;
  const { from, to, empty } = editor.state.selection, tr = editor.state.tr;
  // Comments are annotations, not formatting. Never erase their anchors here.
  for (const name of ["bold", "italic", "underline", "strike", "code", "textStyle", "highlight"]) {
    const mark = editor.schema.marks[name]; if (!mark) continue;
    if (empty) tr.removeStoredMark(mark); else tr.removeMark(from, to, mark);
  }
  editor.view.dispatch(tr); editor.view.focus();
}
