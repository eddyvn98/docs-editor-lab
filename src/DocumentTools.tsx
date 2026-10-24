import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import { Download, FileText, History, MoreHorizontal, Search, Upload, X } from 'lucide-react';
import { starterContent } from './sampleContent';
import { isDocument } from './documentUtils';
import { validateDocument, sanitizeHTML } from './contentIO';
import { normalizeComments } from './comments';
import type { Comment } from './comments';
import { writeStorage } from './storage';
import { ModalSurface } from './ModalSurface';
import { ShareDialog } from './docs-ui/ShareDialog';
import { hydratePortable } from './docs-content/portable';
import { t } from './docs-ui/locale';
import './document-tools.css';
type Version = { id: string; at: string; doc: JSONContent; title?: string; comments?: Comment[] };
const STORE = 'docs-editor-lab-versions-v2';
function loadVersions(): Version[] { try { const values: unknown = JSON.parse(localStorage.getItem(STORE) || localStorage.getItem('docs-editor-lab-versions-v1') || '[]'); return Array.isArray(values) ? values.filter(value => value && typeof value.id === 'string' && isDocument(value.doc)).slice(0, 8) : []; } catch { return []; } }
export function DocumentTools({ editor, title, comments, onTitle, onComments }: {
  editor: Editor; revision: number; title: string; comments: Comment[]; onTitle: (value: string) => void; onComments: (value: Comment[]) => void;
}) {
  const [open, setOpen] = useState(false), [panel, setPanel] = useState<'versions' | 'export' | null>(null), [versions, setVersions] = useState<Version[]>(loadVersions);
  const [selected, setSelected] = useState<string>(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null), fileRef = useRef<HTMLInputElement>(null), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside); return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const checkpoint = () => {
    const item: Version = { id: crypto.randomUUID(), at: new Date().toISOString(), doc: editor.getJSON(), title, comments: structuredClone(comments) }, next = [item, ...versions].slice(0, 8);
    const result = writeStorage(STORE, next); if (!result.ok) throw new Error('Cannot save a recovery checkpoint. Export JSON and free browser storage first.'); setVersions(next); return item;
  };
  const report = (action: () => void) => { try { action(); } catch (cause) { setMessage(cause instanceof Error ? cause.message : String(cause)); } };
  const restore = (version: Version) => report(() => {
    if (!editor.isEditable) return;
    const doc = validateDocument(version.doc, editor);
    if (!window.confirm(t('Restore this version? The current document will be checkpointed first.'))) return;
    checkpoint(); editor.chain().setContent(doc, { errorOnInvalidContent: true }).setMeta('docs-direct-edit', true).run();
    onComments(normalizeComments(version.comments)); if (typeof version.title === 'string') onTitle(version.title.slice(0, 200)); setMessage(t('Version restored'));
  });
  const importFile = async (file?: File) => {
    if (!file || busy || !editor.isEditable) return;
    setBusy(true); setMessage(''); const original = editor.state.doc;
    try {
      if (file.size > 85_000_000) throw new Error('Use a document below 85 MB.');
      const raw = await file.text(); let content: JSONContent | string, importedComments: Comment[] = [], importedTitle = title;
      if (/\.json$/i.test(file.name)) {
        const value: unknown = JSON.parse(raw), envelope = value && typeof value === 'object' ? value as Record<string, unknown> : {};
        content = validateDocument(isDocument(value) ? value : envelope.doc, editor); importedComments = normalizeComments(envelope.comments);
        if (typeof envelope.title === 'string') importedTitle = envelope.title.slice(0, 200);
      } else if (/\.html?$/i.test(file.name)) {
        const html = new DOMParser().parseFromString(raw, 'text/html'), heading = html.querySelector('[data-document-title]');
        importedTitle = (html.title || heading?.textContent || title).slice(0, 200); heading?.remove(); html.querySelector('.document-cover')?.remove(); content = sanitizeHTML(html.body.innerHTML);
      } else throw new Error('Supported imports: JSON and HTML.');
      if (!alive.current || editor.isDestroyed || !editor.isEditable || editor.state.doc !== original) throw new Error('The document changed while the file was loading. Choose the import again.');
      if (!window.confirm(t('Replace the current document? A recovery checkpoint will be saved first.'))) return;
      if (typeof content !== 'string') content = await hydratePortable(content);
      if (!alive.current || editor.isDestroyed || !editor.isEditable || editor.state.doc !== original) throw new Error('The document changed while attachments were loading. Nothing was replaced.');
      checkpoint(); editor.chain().setContent(content, { errorOnInvalidContent: true }).setMeta('docs-direct-edit', true).run(); onComments(importedComments); onTitle(importedTitle); setMessage(`${t('Imported')} ${file.name}`);
    } catch (cause) { if (alive.current) setMessage(cause instanceof Error ? cause.message : 'Import failed.'); }
    finally { if (alive.current) setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const preview = versions.find(version => version.id === selected) || versions[0];
  const previewText = (doc: JSONContent): string => doc.text || (doc.content || []).map(previewText).join(' ');
  return <div className="document-tools docs-document-tools" ref={root} data-ux-overlay>
    <button className="docs-icon-button" aria-label="Document tools" title={t('More')} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}><MoreHorizontal size={19}/></button>
    {open && <div className="docs-document-menu" role="menu" onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); root.current?.querySelector('button')?.focus(); }
      if (['ArrowDown','ArrowUp'].includes(event.key)) { event.preventDefault(); const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')), index = buttons.indexOf(document.activeElement as HTMLButtonElement); buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus(); }
    }}><button role="menuitem" onClick={() => { setOpen(false); window.dispatchEvent(new Event('docs-open-search')); }}><Search size={16}/>{t('Find and replace')}<kbd>Ctrl/Cmd F</kbd></button>
      <button role="menuitem" onClick={() => { setOpen(false); setPanel('export'); }}><Download size={16}/>{t('Export')}</button>
      <button role="menuitem" disabled={busy || !editor.isEditable} onClick={() => { setOpen(false); fileRef.current?.click(); }}><Upload size={16}/>{busy ? t('Importing...') : t('Import')}</button>
      <button role="menuitem" onClick={() => { setOpen(false); setPanel('versions'); }}><History size={16}/>{t('Version history')}</button>
      <button role="menuitem" onClick={() => {
        setOpen(false);
        if (window.confirm('Nạp toàn bộ dữ liệu mẫu 21 Block Lark Docs (Full Parity)?')) {
          editor.chain().setContent(starterContent, { errorOnInvalidContent: true }).setMeta('docs-direct-edit', true).run();
          onTitle('QA - Docs parity checklist (Project Atlas)');
          setMessage('Đã nạp toàn bộ 21 block mẫu Lark Docs!');
        }
      }}><FileText size={16}/>{t('Nạp toàn bộ 21 block mẫu (Demo)')}</button></div>}
    <input ref={fileRef} hidden type="file" accept=".json,.html,.htm" onChange={event => { void importFile(event.target.files?.[0]); }}/>
    {message && !panel && <div className="docs-operation-notice" role="status">{message}<button aria-label="Dismiss document tools notice" onClick={() => setMessage('')}><X size={14}/></button></div>}
    {panel === 'export' && <ShareDialog editor={editor} title={title} comments={comments} onClose={() => setPanel(null)}/>}
    {panel === 'versions' && <ModalSurface title="Version history" onClose={() => setPanel(null)} className="docs-history-dialog">
      <div className="docs-history-header"><p>{t('Local checkpoints in this browser. The eight most recent copies are retained.')}</p><button disabled={!editor.isEditable} className="docs-primary" onClick={() => report(() => { const version = checkpoint(); setSelected(version.id); setMessage(t('Version saved')); })}>{t('Save version')}</button></div>
      <div className="docs-history-grid"><nav aria-label="Saved versions">{versions.map(version => <div key={version.id} className={preview?.id === version.id ? 'is-selected' : ''}><button onClick={() => setSelected(version.id)}><strong>{version.title || t('Untitled')}</strong><small>{Number.isFinite(Date.parse(version.at)) ? new Date(version.at).toLocaleString() : version.at}</small></button><button disabled={!editor.isEditable} aria-label="Delete version" onClick={() => report(() => { const next = versions.filter(item => item.id !== version.id), result = writeStorage(STORE, next); if (!result.ok) throw new Error(result.error); setVersions(next); })}><X size={14}/></button></div>)}</nav>
        {preview ? <section><h3>{preview.title || t('Untitled')}</h3><p>{previewText(preview.doc).slice(0, 2400)}</p><button disabled={!editor.isEditable} onClick={() => restore(preview)}>{t('Restore this version')}</button></section> : <p className="docs-panel-empty">{t('No saved versions yet')}</p>}</div>
      {message && <p role="status">{message}</p>}
    </ModalSurface>}
  </div>;
}
