import type { Editor } from '@tiptap/react';
import { Selection } from '@tiptap/pm/state';
import { blankBlock } from './blockCatalog';
/** Insert without replacing nonempty content, including when a range is selected. */
export function insertNewBlock(editor: Editor, id: string, rows = 3, columns = 3): boolean {
  if (!editor.isEditable) return false;
  const draft = blankBlock(id, rows, columns); if (!draft) return false;
  const { selection, doc } = editor.state;
  const pos = selection.$from.depth ? selection.$from.before(1) : selection.from;
  const current = doc.nodeAt(pos);
  const reuse = current?.type.name === 'paragraph' && current.content.size === 0;
  const at = reuse ? pos : Math.min(doc.content.size, pos + (current?.nodeSize || 0));
  try {
    const node = editor.schema.nodeFromJSON(draft); node.check();
    const trailing = ['image', 'table', 'columns', 'horizontalRule', 'pageBreak'].includes(node.type.name);
    const tr = editor.state.tr.replaceWith(at, reuse ? at + current!.nodeSize : at,
      trailing ? [node, editor.schema.nodes.paragraph.create()] : node);
    tr.doc.check();
    let caret = node.isTextblock ? at + 1 : null;
    node.descendants((child, offset) => { if (caret === null && child.isTextblock) caret = at + offset + 2; });
    tr.setSelection(Selection.near(tr.doc.resolve(Math.min(caret ?? at + node.nodeSize + 1, tr.doc.content.size))));
    editor.view.dispatch(tr.scrollIntoView()); editor.view.focus(); return true;
  } catch { return false; }
}
