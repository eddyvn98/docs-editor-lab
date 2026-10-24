import type { Editor } from '@tiptap/react';
import { DOMSerializer } from '@tiptap/pm/model';
/** Write both formats so lists, task states, tables and inline marks survive paste. */
export async function copySelection(editor: Editor, from: number, to: number) {
  const slice = editor.state.doc.slice(from, to), element = document.createElement('div');
  element.append(DOMSerializer.fromSchema(editor.schema).serializeFragment(slice.content));
  const text = slice.content.textBetween(0, slice.content.size, '\n', '\n');
  if (!navigator.clipboard) throw new Error('Clipboard access requires HTTPS or localhost.');
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([element.innerHTML], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
    else await navigator.clipboard.writeText(text);
  } catch { throw new Error('Clipboard permission was denied. Select the content and copy manually.'); }
}
