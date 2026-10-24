import { useEffect, useRef, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { closeHistory } from '@tiptap/pm/history';
import { Images, Upload } from 'lucide-react';
import { safeImage } from '../safety';
import { blobDataURL } from './assets';
import { t, useDocsLocale } from '../docs-ui/locale';
import { useEditorPulse } from '../useEditorPulse';
function GalleryView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  useEditorPulse(editor); useDocsLocale();
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), token = useRef(0), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; token.current++; }; }, []);
  const add = async (files: FileList | null) => {
    if (!files?.length || !editor.isEditable || busy) return;
    const list = Array.from(files), id = node.attrs.blockId, documentId = editor.state.doc.attrs.docsId, request = ++token.current;
    if (list.length + node.childCount > 12) { setError('A gallery can contain up to 12 images.'); return; }
    if (list.some(file => !/^image\/(png|jpeg|gif|webp)$/.test(file.type) || file.size > 1_500_000) || list.reduce((sum, file) => sum + file.size, 0) > 2_000_000) { setError('Use PNG, JPEG, WebP or GIF images below 1.5 MB each; at most 2 MB per upload.'); return; }
    setBusy(true); setError('');
    try {
      const sources = await Promise.all(list.map(file => blobDataURL(file))), pos = getPos();
      if (!alive.current || editor.isDestroyed || !editor.isEditable || request !== token.current || editor.state.doc.attrs.docsId !== documentId || typeof pos !== 'number') return;
      const current = editor.state.doc.nodeAt(pos);
      if (!current || current.attrs.blockId !== id || current.type.name !== 'imageGallery' || current.childCount + sources.length > 12) throw new Error('The gallery changed. Choose the images again.');
      const images = sources.map((src, index) => { if (!safeImage(src)) throw new Error('Image data is not supported.'); return editor.schema.nodes.image.create({ src, alt: list[index].name, caption: '', width: '100%' }); });
      editor.view.dispatch(closeHistory(editor.state.tr).insert(pos + current.nodeSize - 1, images));
    } catch (cause) { if (alive.current && !editor.isDestroyed) setError(cause instanceof Error ? cause.message : 'Images could not be added.'); }
    finally { if (alive.current && !editor.isDestroyed) setBusy(false); }
  };
  const columns = Math.max(1, Math.min(4, Number(node.attrs.columns) || 3));
  return <NodeViewWrapper className="docs-image-gallery" data-type="imageGallery" data-gallery-columns={columns} data-block-id={node.attrs.blockId} style={{ '--gallery-columns': columns, '--gallery-gap': `${Math.max(0, Math.min(24, Number.isFinite(Number(node.attrs.gap)) ? Number(node.attrs.gap) : 8))}px` } as import('react').CSSProperties}>
    {editor.isEditable && <div className="docs-gallery-tools" data-node-controls contentEditable={false}><Images size={16}/><span>{t('Image gallery')}</span>
      <select aria-label="Gallery layout" value={columns} onChange={event => updateAttributes({ columns: Number(event.target.value) })}>{[1, 2, 3, 4].map(value => <option key={value} value={value}>{value} {t('columns')}</option>)}</select>
      <label>{t('Gap')}<input aria-label="Gallery gap" type="range" min={0} max={24} step={4} value={Number(node.attrs.gap)} onChange={event => updateAttributes({ gap: Number(event.target.value) })}/></label>
      <label className="docs-upload-button"><Upload size={14}/>{busy ? t('Uploading...') : t('Add images')}<input type="file" multiple disabled={busy} accept="image/png,image/jpeg,image/webp,image/gif" onChange={event => { void add(event.target.files); event.target.value = ''; }}/></label></div>}
    {!node.childCount && <p className="docs-gallery-empty" contentEditable={false}>{t('Add images to arrange them in a row or grid.')}</p>}
    <NodeViewContent className="docs-gallery-content"/>{error && <p role="alert" contentEditable={false}>{error}</p>}
  </NodeViewWrapper>;
}
export const ImageGallery = Node.create({
  name: 'imageGallery', group: 'block', content: 'image{0,12}', isolating: true, defining: true,
  addAttributes() { return { columns: { default: 3, parseHTML: element => Math.max(1, Math.min(4, Number(element.getAttribute('data-columns')) || 3)) }, gap: { default: 8, parseHTML: element => Math.max(0, Math.min(24, Number(element.getAttribute('data-gap')) || 0)) } }; },
  parseHTML() { return [{ tag: 'div[data-type="imageGallery"]' }]; },
  renderHTML({ node, HTMLAttributes }) { const columns = Math.max(1, Math.min(4, Number(node.attrs.columns) || 3)), gap = Math.max(0, Math.min(24, Number(node.attrs.gap) || 0)); return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'imageGallery', 'data-columns': columns, 'data-gap': gap, class: 'docs-image-gallery', style: `display:grid;grid-template-columns:repeat(${columns},minmax(0,1fr));gap:${gap}px` }), 0]; },
  addNodeView() { return ReactNodeViewRenderer(GalleryView); },
});
