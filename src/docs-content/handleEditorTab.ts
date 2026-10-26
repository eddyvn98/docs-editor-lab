import type { Editor } from '@tiptap/react';
import { blockIndent } from '../blockStyleModel';

export function handleEditorTab(editor: Editor, event: KeyboardEvent): boolean {
  if (event.key !== 'Tab' || !editor.isEditable || editor.isActive('table')) return false;
  const target = event.target;
  if (!(target instanceof HTMLElement) || !editor.view.dom.contains(target) ||
      target.closest('button,input,textarea,select,[contenteditable="false"],[data-node-controls]')) return false;

  if (editor.isActive('codeBlock')) {
    event.preventDefault();
    editor.commands.insertContent('\t');
    return true;
  }

  const listType = editor.isActive('taskItem') ? 'taskItem' : editor.isActive('listItem') ? 'listItem' : null;
  if (listType) {
    event.preventDefault();
    const chain = editor.chain().focus();
    (event.shiftKey ? chain.liftListItem(listType) : chain.sinkListItem(listType)).run();
    return true;
  }

  const { $from } = editor.state.selection;
  let depth = $from.depth;
  while (depth > 0 && !['paragraph', 'heading'].includes($from.node(depth).type.name)) depth--;
  if (!depth) return false;

  event.preventDefault();
  const node = $from.node(depth), position = $from.before(depth);
  const current = blockIndent(node.attrs.blockIndent);
  const next = Math.max(0, Math.min(8, current + (event.shiftKey ? -1 : 1)));
  if (next !== current) {
    editor.view.dispatch(editor.state.tr.setNodeMarkup(position, undefined, { ...node.attrs, blockIndent: next }));
  }
  editor.view.focus();
  return true;
}
