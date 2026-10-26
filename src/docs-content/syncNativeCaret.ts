import type { Editor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';

/** Reconcile a collapsed browser caret before structural editing shortcuts.
 * Pointer selection may settle after React overlays remount on narrow screens;
 * using the stale ProseMirror position would edit the previous block instead. */
export function syncNativeCaret(editor: Editor, event?: KeyboardEvent): void {
  if (editor.view.composing || (event && (event.isComposing ||
      !['Tab', 'Enter', 'Backspace', 'Delete'].includes(event.key)))) return;
  const native = editor.view.dom.ownerDocument.getSelection(), selection = editor.state.selection;
  if (!native?.isCollapsed || !native.anchorNode || !editor.view.dom.contains(native.anchorNode) ||
      !(selection instanceof TextSelection) || !selection.empty) return;
  try {
    const at = editor.view.posAtDOM(native.anchorNode, native.anchorOffset);
    if (at === selection.from || at < 0 || at > editor.state.doc.content.size) return;
    const resolved = TextSelection.near(editor.state.doc.resolve(at));
    if (!resolved.empty || !resolved.$from.parent.isTextblock) return;
    editor.view.dispatch(editor.state.tr.setSelection(resolved).setMeta('addToHistory', false));
  } catch { /* Ignore transient DOM nodes removed during a pointer redraw. */ }
}
