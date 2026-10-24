import type { Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import { Selection } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';
import type { Popup } from './targets';
import { blankBlock } from './blockCatalog';
/** Remove just the command token. Prefix/suffix text, marks and the containing block survive. */
export function applySlash(editor: Editor, popup: Popup, id: string, rows = 3, columns = 3): boolean {
  const command = popup.command, previous = editor.state.doc.nodeAt(popup.pos);
  if (!editor.isEditable || !command || !previous?.isTextblock || command.from < popup.pos + 1 || command.to >= popup.pos + previous.nodeSize) return false;
  if (popup.blockId && previous.attrs.blockId !== popup.blockId) return false;
  const token = editor.state.doc.textBetween(command.from, command.to);
  if (token.charAt(0) !== '/' || token.slice(1).trim().toLocaleLowerCase() !== (popup.query || '')) return false;
  if (id === 'synced' && Array.from({ length: editor.state.selection.$from.depth }, (_, i) => editor.state.selection.$from.node(i + 1).type.name).includes('syncedBlock')) return false;
  try {
    const tr = closeHistory(editor.state.tr).delete(command.from, command.to), clean = tr.doc.nodeAt(popup.pos); if (!clean) return false;
    if (id === 'templates') { tr.setSelection(Selection.near(tr.doc.resolve(command.from))); editor.view.dispatch(tr); return true; }
    let draft = blankBlock(id, rows, columns, true) as JSONContent | null; if (!draft) return false;
    if (id === 'inline-equation') { const node = editor.schema.nodeFromJSON(draft); tr.insert(command.from, node).setSelection(Selection.near(tr.doc.resolve(command.from + node.nodeSize))); editor.view.dispatch(tr); editor.view.focus(); return true; }
    const textLike = id === 'paragraph' || /^h[1-9]$/.test(id), converts = textLike || ['bullet','numbered','task','quote','callout','code','toggle'].includes(id);
    if (converts) {
      const paragraph = { type: 'paragraph', content: clean.content.toJSON() } as JSONContent;
      if (textLike) draft = { ...draft, content: clean.content.toJSON() };
      else if (['bullet','numbered','task'].includes(id)) draft.content![0].content = [paragraph];
      else if (['quote','callout','toggle'].includes(id)) draft.content = [paragraph];
      else { const text = clean.textBetween(0, clean.content.size, '\n', '\n'); draft.content = text ? [{ type: 'text', text }] : undefined; }
      draft.attrs = { ...clean.attrs, ...draft.attrs };
    }
    const node = editor.schema.nodeFromJSON(draft); node.check();
    const replace = converts || command.wholeLine, at = replace ? popup.pos : popup.pos + clean.nodeSize, after = replace ? popup.pos + clean.nodeSize : at;
    tr.replaceWith(at, after, converts ? node : [node, editor.schema.nodes.paragraph.create()]); tr.doc.check();
    let caret = node.isTextblock ? at + 1 : null;
    node.descendants((child, offset) => { if (caret === null && child.isTextblock) caret = at + offset + 2; });
    tr.setSelection(Selection.near(tr.doc.resolve(Math.min(caret ?? at + node.nodeSize + 1, tr.doc.content.size)))); editor.view.dispatch(tr.scrollIntoView()); editor.view.focus(); return true;
  } catch { return false; }
}
