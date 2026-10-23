import type { Editor } from '@tiptap/react';
import { Selection } from '@tiptap/pm/state';
import { blankBlock } from './blockCatalog';
import { foldingKey } from './HeadingFolding';
import { foldedSpanEnd } from './outlineModel';
/** Insert without replacing nonempty content. An explicit target stays in its parent container. */
export function insertNewBlock(editor: Editor, id: string, rows = 3, columns = 3, afterPos?: number): boolean {
  if (!editor.isEditable) return false;
  const draft = blankBlock(id, rows, columns); if (!draft) return false;
  const { selection, doc } = editor.state;
  const pos = afterPos ?? (selection.$from.depth ? selection.$from.before(1) : selection.from);
  if (pos < 0 || pos > doc.content.size) return false;
  const current = doc.nodeAt(pos);
  if (afterPos !== undefined && !current) return false;
  const reuse = afterPos === undefined && current?.type.name === 'paragraph' && current.content.size === 0;
  const fold = foldingKey.getState(editor.state);
  const end = current && fold ? foldedSpanEnd(pos, current.nodeSize, fold.sections, fold.ids) : pos + (current?.nodeSize || 0);
  const at = reuse ? pos : Math.min(doc.content.size, end);
  try {
    let node = editor.schema.nodeFromJSON(draft); node.check();
    const inList = afterPos !== undefined && current && ['listItem', 'taskItem'].includes(current.type.name);
    if (inList) {
      const paragraph = editor.schema.nodes.paragraph.create();
      node = current.type.create(current.type.name === 'taskItem' ? { checked: false } : null,
        node.type.name === 'paragraph' ? [node] : [paragraph, node]);
    }
    const trailing = !inList && ['image', 'table', 'columns', 'horizontalRule', 'pageBreak'].includes(node.type.name);
    const tr = editor.state.tr.replaceWith(at, reuse ? at + current!.nodeSize : at,
      trailing ? [node, editor.schema.nodes.paragraph.create()] : node);
    tr.doc.check();
    let caret = node.isTextblock ? at + 1 : null;
    node.descendants((child, offset) => { if (caret === null && child.isTextblock) caret = at + offset + 2; });
    tr.setSelection(Selection.near(tr.doc.resolve(Math.min(caret ?? at + node.nodeSize + 1, tr.doc.content.size))));
    editor.view.dispatch(tr.scrollIntoView()); editor.view.focus(); return true;
  } catch { return false; }
}
