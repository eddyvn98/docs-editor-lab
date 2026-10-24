import { Extension } from '@tiptap/core';
import { Plugin, Selection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { BlockRangeSelection } from './blockSelection';
import { batchAction } from './blockBatchActions';

export const BlockSelectionExtension = Extension.create({
  name: 'docsBlockSelection',
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [new Plugin({ props: {
      decorations(state) {
        if (!(state.selection instanceof BlockRangeSelection)) return null;
        const decorations: Decoration[] = [];
        state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos, parent) => {
          if (parent === state.doc) decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: 'docs-block-selected' }));
          return false;
        });
        return DecorationSet.create(state.doc, decorations);
      },
      handleKeyDown(view, event) {
        if (!(view.state.selection instanceof BlockRangeSelection) || event.isComposing) return false;
        if (event.shiftKey && event.key === 'F10') { event.preventDefault(); event.stopPropagation(); const rect = view.coordsAtPos(Math.min(view.state.selection.from + 1, view.state.doc.content.size)); view.dom.dispatchEvent(new CustomEvent('docs-batch-context', { detail: { x: rect.left, y: rect.bottom } })); return true; }
        if (event.key === 'Escape') {
          view.dispatch(view.state.tr.setSelection(Selection.near(view.state.selection.$from))); return true;
        }
        if (!editor.isEditable) return false;
        if (event.key === 'Backspace' || event.key === 'Delete') return batchAction(editor, 'delete');
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') return batchAction(editor, 'duplicate');
        if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) return batchAction(editor, event.key === 'ArrowUp' ? 'up' : 'down');
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
          view.dispatch(view.state.tr.setSelection(BlockRangeSelection.create(view.state.doc, 0, view.state.doc.content.size))); return true;
        }
        if (event.shiftKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
          const { from, to } = view.state.selection;
          const sibling = event.key === 'ArrowUp' ? view.state.doc.resolve(from).nodeBefore : view.state.doc.resolve(to).nodeAfter;
          if (sibling) view.dispatch(view.state.tr.setSelection(BlockRangeSelection.create(view.state.doc,
            event.key === 'ArrowUp' ? from - sibling.nodeSize : from, event.key === 'ArrowDown' ? to + sibling.nodeSize : to)).scrollIntoView());
          return true;
        }
        return false;
      },
    } })];
  },
});
