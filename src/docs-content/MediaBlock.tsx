import { useEffect, useRef, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Download, ExternalLink, File as FileIcon, Film, Globe, Music, Pencil, Upload, X } from 'lucide-react';
import { safeMediaURL, saveAsset } from './assets';
import { useAssetSource } from './useAssetSource';
import { t, useDocsLocale } from '../docs-ui/locale';
import { useEditorPulse } from '../useEditorPulse';
const kinds = ['file', 'audio', 'video', 'web'];
function MediaView({ node, editor, updateAttributes, getPos, selected }: NodeViewProps) {
  useEditorPulse(editor); useDocsLocale();
  const a = node.attrs, kind = kinds.includes(a.kind) ? a.kind : 'file';
  const [editing, setEditing] = useState(!a.src && !a.assetId), [source, setSource] = useState(String(a.src || ''));
  const [label, setLabel] = useState(String(a.label || '')), [description, setDescription] = useState(String(a.description || ''));
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), alive = useRef(true);
  const media = useAssetSource(String(a.assetId || ''), String(a.src || ''), kind), Icon = kind === 'audio' ? Music : kind === 'video' ? Film : kind === 'web' ? Globe : FileIcon;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (!editor.isEditable) setEditing(false); }, [editor.isEditable]);
  const edit = () => { setSource(String(a.src || '')); setLabel(String(a.label || '')); setDescription(String(a.description || '')); setError(''); setEditing(true); };
  const upload = async (file: File | undefined) => {
    if (!file || busy || !editor.isEditable) return;
    if (['audio', 'video'].includes(kind) && !file.type.startsWith(`${kind}/`)) { setError(`Choose a ${kind} file supported by your browser.`); return; }
    const id = a.blockId, documentId = editor.state.doc.attrs.docsId;
    setBusy(true); setError('');
    try {
      const asset = await saveAsset(file);
      const pos = getPos();
      if (!alive.current || editor.isDestroyed || !editor.isEditable || editor.state.doc.attrs.docsId !== documentId || typeof pos !== 'number' || editor.state.doc.nodeAt(pos)?.attrs.blockId !== id) return;
      updateAttributes({ assetId: asset.id, src: '', label: file.name, size: file.size, mime: file.type }); setEditing(false);
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : 'Upload failed.'); }
    finally { if (alive.current) setBusy(false); }
  };
  const save = () => {
    if (!editor.isEditable) return;
    const url = source ? safeMediaURL(source, kind) : null;
    if (source && !url) { setError('Use a complete http:// or https:// URL.'); return; }
    if (!url && !a.assetId) { setError('Upload a file or enter a URL.'); return; }
    updateAttributes({ src: url || '', assetId: url ? '' : a.assetId, label: label.slice(0, 200), description: description.slice(0, 1000) }); setEditing(false);
  };
  const host = (() => { try { return new URL(String(a.src)).hostname; } catch { return ''; } })();
  return <NodeViewWrapper className={`docs-media-block ${selected ? 'is-selected' : ''}`} data-type="mediaBlock" data-block-id={a.blockId} contentEditable={false}>
    <div className="docs-media-heading"><span className="docs-media-icon"><Icon size={22}/></span><div><strong>{String(a.label || (kind === 'web' ? 'Web card' : `${kind[0].toUpperCase()}${kind.slice(1)}`))}</strong>
      <small>{a.size ? `${(Number(a.size) / 1_000_000).toFixed(1)} MB` : host || t('Add content')}</small></div>
      {editor.isEditable && <button aria-label="Edit media" onClick={edit}><Pencil size={15}/></button>}
      {media.url && (kind === 'file' || kind === 'web') && <a href={media.url} download={kind === 'file' ? String(a.label || 'Attachment') : undefined} target={kind === 'web' ? '_blank' : undefined} rel="noopener noreferrer" aria-label={kind === 'web' ? 'Open link' : 'Download attachment'}>{kind === 'web' ? <ExternalLink size={17}/> : <Download size={17}/>}</a>}
    </div>
    {!editing && media.url && kind === 'audio' && <audio controls preload="metadata" src={media.url} onError={() => setError('This audio format or URL could not be played.')}/>}
    {!editing && media.url && kind === 'video' && <video controls playsInline preload="metadata" src={media.url} onError={() => setError('This video format or URL could not be played. Use a direct video file URL.')}/>}
    {!editing && a.description && <p className="docs-media-description">{String(a.description)}</p>}
    {!editing && !media.url && !media.error && <p className="docs-muted">{a.assetId ? t('Loading attachment...') : t('No content added')}</p>}
    {editing && editor.isEditable && <div className="docs-media-editor" data-node-controls>
      <label>{t('Title')}<input aria-label="Media title" maxLength={200} value={label} onChange={event => setLabel(event.target.value)}/></label>
      <label>URL<input aria-label="Media URL" placeholder={kind === 'web' ? 'https://example.com' : 'https://example.com/file'} value={source} onChange={event => setSource(event.target.value)}/></label>
      {kind === 'web' && <label>{t('Description')}<textarea aria-label="Web card description" maxLength={1000} value={description} onChange={event => setDescription(event.target.value)}/></label>}
      <div className="docs-media-actions">{kind !== 'web' && <label className="docs-upload-button"><Upload size={15}/>{busy ? t('Uploading...') : t('Upload')}<input disabled={busy} type="file" accept={kind === 'file' ? undefined : `${kind}/*`} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }}/></label>}
        <button disabled={busy} className="docs-primary" onClick={save}>{t('Save')}</button><button disabled={busy} onClick={() => setEditing(false)}><X size={14}/>{t('Cancel')}</button></div>
      {kind !== 'web' && <small className="docs-muted">{t('Attachments are stored in this browser. Export a portable JSON copy to move them.')}</small>}
    </div>}
    {(error || media.error) && <p role="alert" className="docs-error">{error || media.error}</p>}
  </NodeViewWrapper>;
}
export const MediaBlock = Node.create({
  name: 'mediaBlock', group: 'block', atom: true, draggable: true,
  addAttributes() { return Object.fromEntries(Object.entries({ kind: 'file', src: '', assetId: '', label: '', description: '', mime: '', size: 0 }).map(([key, value]) => [key, { default: value, parseHTML: (element: HTMLElement) => key === 'size' ? Number(element.getAttribute(`data-${key}`)) || 0 : element.getAttribute(`data-${key}`) || value, renderHTML: (attrs: Record<string, unknown>) => ({ [`data-${key}`]: attrs[key] }) }])); },
  parseHTML() { return [{ tag: 'figure[data-type="mediaBlock"]' }]; },
  renderHTML({ node, HTMLAttributes }) {
    const kind = String(node.attrs.kind), source = safeMediaURL(node.attrs.src, kind), label = String(node.attrs.label || kind);
    const attrs = mergeAttributes(HTMLAttributes, { 'data-type': 'mediaBlock', class: 'docs-media-block' });
    if (source && ['audio', 'video'].includes(kind)) return ['figure', attrs, [kind, { controls: '', preload: 'metadata', src: source }], ['figcaption', {}, label]];
    return ['figure', attrs, source ? ['a', { href: source, ...(kind === 'file' ? { download: label, 'data-doc-file': 'true' } : { target: '_blank', rel: 'noopener noreferrer' }) }, label] : ['span', {}, label], ['p', {}, String(node.attrs.description || '')]];
  },
  addNodeView() { return ReactNodeViewRenderer(MediaView); },
});
