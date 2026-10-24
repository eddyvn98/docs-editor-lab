import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';
import { safeImage } from '../safety';
export const covers: Record<string, string> = {
  mist: 'linear-gradient(125deg,#d9e8f3,#f4efe5 60%,#e8ddee)',
  ocean: 'linear-gradient(115deg,#b8d9e8,#d8ecec 55%,#93bec9)',
  meadow: 'linear-gradient(120deg,#d6e5ca,#eef0dc 50%,#b4cbb2)',
  sunrise: 'linear-gradient(120deg,#f2d5b5,#f7e4d3 55%,#edc4b8)',
  dusk: 'linear-gradient(120deg,#b8b5d8,#ded2e6 55%,#bcc4e6)',
  paper: 'linear-gradient(120deg,#e5e3dc,#f5f3ee)',
};
export function metadata(editor: Editor) {
  const a = editor.state.doc.attrs;
  return { icon: String(a.docsIcon || '').slice(0, 16), cover: String(a.docsCover || ''),
    coverPosition: Math.max(0, Math.min(100, (Number.isFinite(Number(a.docsCoverPosition)) ? Number(a.docsCoverPosition) : 50))), updatedAt: String(a.docsUpdatedAt || '') };
}
export function updateMetadata(editor: Editor, values: { icon?: string; cover?: string; coverPosition?: number }) {
  if (!editor.isEditable) return;
  const tr = closeHistory(editor.state.tr);
  if (values.icon !== undefined) tr.setDocAttribute('docsIcon', values.icon.slice(0, 16));
  if (values.cover !== undefined) {
    const source = values.cover;
    if (source && !covers[source] && !safeImage(source)) throw new Error('Use a PNG, JPEG, GIF or WebP image.');
    tr.setDocAttribute('docsCover', source);
  }
  if (values.coverPosition !== undefined) tr.setDocAttribute('docsCoverPosition', Math.max(0, Math.min(100, values.coverPosition)));
  editor.view.dispatch(tr);
}
export const DocumentMetadata = Extension.create({
  name: 'documentMetadata',
  addGlobalAttributes() { return [{ types: ['doc'], attributes: {
    docsId: { default: null }, docsIcon: { default: '' }, docsCover: { default: '' },
    docsCoverPosition: { default: 50 }, docsUpdatedAt: { default: '' },
  } }]; },
  onCreate() {
    if (!this.editor.state.doc.attrs.docsId) this.editor.view.dispatch(this.editor.state.tr.setDocAttribute('docsId', crypto.randomUUID()).setMeta('addToHistory', false).setMeta('docs-metadata', true));
  },
  addProseMirrorPlugins() { return [new Plugin({ key: new PluginKey('docsDocumentMetadataPlugin'),
    appendTransaction(transactions, _old, state) {
      if (!transactions.some(tr => tr.docChanged && !tr.getMeta('docs-metadata'))) return null;
      const tr = state.tr.setMeta('docs-metadata', true).setMeta('addToHistory', false);
      if (!state.doc.attrs.docsId) tr.setDocAttribute('docsId', crypto.randomUUID());
      tr.setDocAttribute('docsUpdatedAt', new Date().toISOString());
      return tr;
    },
  })]; },
});
