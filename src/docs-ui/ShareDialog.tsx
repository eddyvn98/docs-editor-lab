import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Download, FileJson, FileText, Printer, Share2 } from 'lucide-react';
import { ModalSurface } from '../ModalSurface';
import type { Comment } from '../comments';
import { portableDocument, portableHTML } from '../docs-content/portable';
import { downloadText } from '../storage';
import { t } from './locale';
export function ShareDialog({ editor, title, comments, onClose }: { editor: Editor; title: string; comments: Comment[]; onClose: () => void }) {
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const name = (title || 'Document').replace(/[\/:*?"<>|]/g, '-').slice(0, 100);
  const exportCopy = async (format: 'json' | 'html' | 'share') => {
    if (busy) return; setBusy(true); setMessage('');
    try {
      const value = format === 'json' ? JSON.stringify({ version: 2, title, doc: await portableDocument(editor.getJSON()), comments: structuredClone(comments), savedAt: new Date().toISOString() }, null, 2) : await portableHTML(editor, title);
      if (!alive.current) return;
      if (format === 'share') {
        const file = new File([value], `${name}.html`, { type: 'text/html' });
        if (!navigator.canShare?.({ files: [file] })) { setMessage(t('File sharing is unavailable in this browser. Download a copy below.')); return; }
        await navigator.share({ files: [file], title });
      } else downloadText(`${name}.${format}`, value, format === 'json' ? 'application/json' : 'text/html');
    } catch (cause) { if (alive.current && !(cause instanceof DOMException && cause.name === 'AbortError')) setMessage(cause instanceof Error ? cause.message : t('Export failed.')); }
    finally { if (alive.current) setBusy(false); }
  };
  return <ModalSurface title="Share document" onClose={onClose} className="docs-share-dialog">
    <div className="docs-share-summary"><span className="docs-share-file"><FileText size={24}/></span><div><strong>{title || t('Untitled')}</strong><p>{t('Local document')}</p></div></div>
    <p className="docs-muted">{t('This document stays in this browser. Send an exported copy; a local page URL does not give other people access.')}</p>
    <button disabled={busy} className="docs-primary docs-share-native" onClick={() => { void exportCopy('share'); }}><Share2 size={17}/>{t('Send a copy')}</button>
    <div className="docs-export-options">
      <button disabled={busy} onClick={() => { void exportCopy('json'); }}><FileJson size={20}/><span>{t('Download JSON')}<small>{t('Editable document, comments and attachments')}</small></span><Download size={16}/></button>
      <button disabled={busy} onClick={() => { void exportCopy('html'); }}><FileText size={20}/><span>{t('Download HTML')}<small>{t('Read in any browser')}</small></span><Download size={16}/></button>
      <button onClick={() => window.print()}><Printer size={20}/><span>{t('Print / PDF')}<small>{t('Use the browser print dialog')}</small></span></button>
    </div>
    {busy && <p role="status">{t('Preparing document and attachments...')}</p>}{message && <p role="status">{message}</p>}
  </ModalSurface>;
}
