import { Extension, Mark, mergeAttributes } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import { Plugin, PluginKey, Selection } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { annotateChange } from './reviewTransactions';
const preference = 'docs-editor-suggest-mode';
const savedMode = () => { try { return localStorage.getItem(preference) === 'true'; } catch { return false; } };
export const suggestionKey = new PluginKey<{ enabled: boolean }>('docsSuggestions');
export const isSuggesting = (editor: Editor) => suggestionKey.getState(editor.state)?.enabled || false;
export function setSuggesting(editor: Editor, enabled: boolean) {
  editor.view.dispatch(editor.state.tr.setMeta(suggestionKey, { enabled }).setMeta('addToHistory', false));
  try { localStorage.setItem(preference, String(enabled)); } catch { /* The session mode still works. */ }
}
export const SuggestionMark = Mark.create({
  name: 'suggestion', inclusive: false, excludes: 'suggestion',
  addAttributes() { return { id: { default: '', parseHTML: el => el.getAttribute('data-suggestion-id') }, kind: { default: 'insert', parseHTML: el => el.tagName === 'DEL' ? 'delete' : 'insert' }, at: { default: '', parseHTML: el => el.getAttribute('data-suggestion-at') } }; },
  parseHTML() { return [{ tag: 'ins[data-suggestion-id]' }, { tag: 'del[data-suggestion-id]' }]; },
  renderHTML({ mark, HTMLAttributes }) { return [mark.attrs.kind === 'delete' ? 'del' : 'ins', mergeAttributes(HTMLAttributes, { 'data-suggestion-id': mark.attrs.id, 'data-suggestion-at': mark.attrs.at, class: `docs-suggestion-${mark.attrs.kind === 'delete' ? 'delete' : 'insert'}`, ...(mark.attrs.kind === 'delete' ? { contenteditable: 'false' } : {}) }), 0]; },
});
const rootTypes = ['paragraph','heading','blockquote','callout','codeBlock','bulletList','orderedList','taskList','image','table','columns','horizontalRule','toggleBlock','pageBreak','inlineSheet','docsToc','docsTimeline','docsMermaid','imageGallery','mediaBlock','equation','syncedBlock'];
export const Suggestions = Extension.create({
  name: 'docsSuggestions', priority: 300,
  addGlobalAttributes() { return [{ types: rootTypes, attributes: Object.fromEntries(['reviewId','reviewKind','reviewAt'].map(key => [key, { default: null, parseHTML: (element: HTMLElement) => element.getAttribute(`data-${key.toLowerCase()}`), renderHTML: (attrs: Record<string, unknown>) => attrs[key] ? { [`data-${key.toLowerCase()}`]: attrs[key] } : {} }])) }]; },
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [new Plugin({
      key: suggestionKey,
      state: { init: () => ({ enabled: savedMode() }), apply: (tr, value) => tr.getMeta(suggestionKey) || value },
      appendTransaction(transactions, oldState, state) {
        if (!suggestionKey.getState(state)?.enabled || editor.view.composing) return null;
        if (transactions.some(tr => tr.getMeta('suggestion-annotation') || tr.getMeta('suggestion-resolution') || tr.getMeta('docs-direct-edit') || tr.getMeta('history$'))) return null;
        const composition = transactions.find(tr => tr.getMeta('docs-composition'))?.getMeta('docs-composition') as PMNode | undefined;
        if (!composition && !transactions.some(tr => tr.docChanged && tr.getMeta('addToHistory') !== false && !tr.getMeta('synced-propagation'))) return null;
        return annotateChange(composition || oldState.doc, state);
      },
      props: {
        decorations(state) {
          const decorations: Decoration[] = [];
          state.doc.descendants((node, pos) => { if (node.attrs.reviewId) { decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: `docs-review-${node.attrs.reviewKind}-block`, 'data-suggestion-id': node.attrs.reviewId, ...(node.attrs.reviewKind === 'delete' ? { contenteditable: 'false' } : {}) })); return false; } });
          return DecorationSet.create(state.doc, decorations);
        },
        handleKeyDown(view, event) {
          if (event.isComposing || !editor.isEditable) return false;
          if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === 'x') { event.preventDefault(); setSuggesting(editor, !isSuggesting(editor)); return true; }
          if (!isSuggesting(editor) || !view.state.selection.empty || !['Backspace','Delete'].includes(event.key)) return false;
          const $pos = view.state.selection.$from, adjacent = event.key === 'Backspace' ? $pos.nodeBefore : $pos.nodeAfter;
          if (adjacent?.marks.some(mark => mark.type.name === 'suggestion' && mark.attrs.kind === 'delete')) {
            const pos = Math.max(0, Math.min(view.state.doc.content.size, $pos.pos + (event.key === 'Backspace' ? -adjacent.nodeSize : adjacent.nodeSize)));
            view.dispatch(view.state.tr.setSelection(Selection.near(view.state.doc.resolve(pos)))); return true;
          }
          return false;
        },
      },
      view(view) {
        let before: PMNode | null = null, frame = 0;
        const start = () => { if (isSuggesting(editor)) before = view.state.doc; };
        const end = () => {
          const snapshot = before; before = null;
          if (snapshot) frame = requestAnimationFrame(() => { if (!editor.isDestroyed && isSuggesting(editor)) view.dispatch(view.state.tr.setMeta('docs-composition', snapshot)); });
        };
        view.dom.addEventListener('compositionstart', start); view.dom.addEventListener('compositionend', end);
        return { destroy() { cancelAnimationFrame(frame); view.dom.removeEventListener('compositionstart', start); view.dom.removeEventListener('compositionend', end); } };
      },
    })];
  },
});
