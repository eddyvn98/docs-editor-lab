import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';
export const BLOCK_TYPES = ['paragraph','heading','blockquote','callout','codeBlock','bulletList','orderedList','taskList','listItem','taskItem','image','table','columns','horizontalRule','toggleBlock','pageBreak','inlineSheet','docsToc','docsTimeline','docsMermaid','mediaBlock','equation','imageGallery','syncedBlock'];
export const BlockIdentity = Extension.create({
  name: 'blockIdentity',
  addGlobalAttributes() { return [{ types: BLOCK_TYPES, attributes: { blockId: {
    default: null, parseHTML: (element: HTMLElement) => element.getAttribute('data-block-id'),
    renderHTML: (attrs: Record<string, unknown>) => attrs.blockId ? { 'data-block-id': attrs.blockId } : {},
  } } }]; },
  onCreate() { this.editor.view.dispatch(this.editor.state.tr.setMeta('initializeBlockIds', true)); },
  addProseMirrorPlugins() { return [new Plugin({
    appendTransaction(transactions, _old, state) {
      if (!transactions.some(tr => tr.docChanged || tr.getMeta('initializeBlockIds'))) return null;
      const seen = new Set<string>(), tr = state.tr;
      state.doc.descendants((node, pos) => {
        if (!BLOCK_TYPES.includes(node.type.name)) return;
        const id: unknown = node.attrs.blockId;
        if (typeof id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(id) && !seen.has(id)) seen.add(id);
        else { const next = crypto.randomUUID(); seen.add(next); tr.setNodeMarkup(pos, undefined, { ...node.attrs, blockId: next }); }
      });
      return tr.docChanged ? tr.setMeta('addToHistory', false) : null;
    },
  })]; },
});
export function positionById(editor: Editor, id: string): number | null {
  let result: number | null = null;
  editor.state.doc.descendants((node, pos) => { if (result !== null) return false; if (node.attrs.blockId === id) { result = pos; return false; } return true; });
  return result;
}
