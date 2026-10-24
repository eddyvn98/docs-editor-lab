import type { JSONContent } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import { DOMSerializer } from '@tiptap/pm/model';
import { readAsset, saveAsset, blobDataURL, safeMediaURL } from './assets';
import { exportHTML } from '../contentIO';
/** Replace binary references with data URLs only for an explicit portable export. */
export async function portableDocument(document: JSONContent): Promise<JSONContent> {
  const doc = structuredClone(document), cache = new Map<string, string>(); let total = 0;
  const visit = async (node: JSONContent): Promise<void> => {
    const id = node.attrs?.assetId;
    if (typeof id === 'string' && id) {
      if (!cache.has(id)) {
        const asset = await readAsset(id); total += asset.size;
        if (total > 60_000_000) throw new Error('Portable exports support up to 60 MB of attachments. Download larger attachments separately.');
        const kind = node.attrs?.kind, blob = kind === 'file' ? new Blob([asset.blob], { type: 'application/octet-stream' }) : asset.blob;
        cache.set(id, await blobDataURL(blob));
      }
      node.attrs = { ...node.attrs, assetId: '', src: cache.get(id) };
    }
    for (const child of node.content || []) await visit(child);
  };
  await visit(doc); return doc;
}
export async function hydratePortable(document: JSONContent): Promise<JSONContent> {
  const doc = structuredClone(document), cache = new Map<string, string>();
  const visit = async (node: JSONContent): Promise<void> => {
    const source = node.attrs?.src;
    if (node.type === 'mediaBlock' && typeof source === 'string' && source.startsWith('data:')) {
      if (!safeMediaURL(source, String(node.attrs?.kind))) throw new Error('Unsafe attachment data.');
      if (!cache.has(source)) {
        const comma = source.indexOf(','), mime = source.slice(5, source.indexOf(';')), binary = atob(source.slice(comma + 1));
        const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
        const asset = await saveAsset(new Blob([bytes], { type: mime }), String(node.attrs?.label || 'Attachment'));
        cache.set(source, asset.id);
      }
      node.attrs = { ...node.attrs, assetId: cache.get(source), src: '' };
    }
    for (const child of node.content || []) await visit(child);
  };
  await visit(doc); return doc;
}
export async function portableHTML(editor: Editor, title: string): Promise<string> {
  const doc = editor.schema.nodeFromJSON(await portableDocument(editor.getJSON()));
  const wrapper = document.createElement('div'); wrapper.append(DOMSerializer.fromSchema(editor.schema).serializeFragment(doc.content));
  return exportHTML(editor, title, wrapper.innerHTML, doc.attrs);
}
