import { TextSelection } from '@tiptap/pm/state';
import { canSplit } from '@tiptap/pm/transform';
import type { EditorView } from '@tiptap/pm/view';

function isBeforePageBreak(view: EditorView): boolean {
  const { $from } = view.state.selection;
  return $from.depth === 1 && view.state.doc.nodeAt($from.after(1))?.type.name === 'pageBreak';
}

export function handlePageBreakEditing(view: EditorView, event: KeyboardEvent): boolean {
  if (event.isComposing || event.shiftKey || !isBeforePageBreak(view)) return false;
  const { state } = view, { selection } = state;

  if (event.key === 'Enter') {
    const transaction = selection.empty ? state.tr : state.tr.deleteSelection();
    const { $from } = transaction.selection;
    if ($from.depth !== 1 || !$from.parent.isTextblock || !canSplit(transaction.doc, $from.pos)) return false;
    transaction.split($from.pos);
    transaction.setSelection(TextSelection.near(transaction.doc.resolve($from.pos + 1), 1));
    view.dispatch(transaction);
    event.preventDefault();
    return true;
  }

  if (event.key !== 'Backspace') return false;
  if (!selection.empty) {
    if (selection.$from.parent !== selection.$to.parent) return false;
    event.preventDefault();
    view.dispatch(state.tr.delete(selection.from, selection.to));
    return true;
  }

  const { $from } = selection, previous = $from.nodeBefore;
  if (!$from.parentOffset || !previous?.isText) return false;
  const character = Array.from($from.parent.textBetween(0, $from.parentOffset)).at(-1);
  if (!character) return false;
  event.preventDefault();
  view.dispatch(state.tr.delete(selection.from - character.length, selection.from));
  return true;
}
