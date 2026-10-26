import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Anchored } from './Anchored';
import type { Popup } from './targets';
import { restoreTarget } from './targets';
import { imageToDataUrl } from './imageFiles';
import { safeImage, safeLink, clampImageWidth } from './safety';

export function DetailPopover({ editor, popup, onClose, onComment }: {
  editor: Editor; popup: Popup; onClose: (restore?: boolean) => void; onComment: (note: string) => void;
}) {
  const isImage = popup.type === 'image';
  const node = editor.state.doc.nodeAt(popup.pos);
  const [url, setUrl] = useState(isImage ? String(node?.attrs.src || '') : String(editor.getAttributes('link').href || ''));
  const [caption, setCaption] = useState(String(isImage ? node?.attrs.caption || '' : ''));
  const [alt, setAlt] = useState(String(isImage ? node?.attrs.alt || '' : ''));
  const [width, setWidth] = useState(parseFloat(clampImageWidth(node?.attrs.width)));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  const upload = useRef(0);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('input,textarea')?.focus({ preventScroll: true });
    return () => { upload.current++; };
  }, []);
  const save = () => {
    try {
      if (busy) return;
      if (!editor.isEditable) throw new Error('Return to editing mode to change this content.');
      if (isImage) {
        const src = safeImage(url); if (!src) throw new Error('Use an HTTP(S) image URL or upload a PNG, JPEG, WebP or GIF.');
        const current = editor.state.doc.nodeAt(popup.pos);
        if (current?.type.name !== 'image') throw new Error('This image was deleted.');
        const crop = src !== current.attrs.src ? { crop: null, imageRatio: 1 } : {};
        editor.chain().setNodeSelection(popup.pos).updateAttributes('image', { src, caption: caption.trim(), alt: alt.trim(), width: `${width}%`, ...crop }).run();
      } else if (popup.type === 'link') {
        const href = safeLink(url); if (!href) throw new Error('Use https://, http://, mailto:, tel: or a block link.');
        if (!restoreTarget(editor, popup, false)) throw new Error('The selected text no longer exists.');
        const active = editor.isActive('link');
        let chain = editor.chain();
        if (active) chain = chain.extendMarkRange('link');
        if (!active && editor.state.selection.empty) chain = chain.insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] });
        else chain = chain.setLink({ href });
        if (!chain.run()) throw new Error('A link cannot be added here.');
      } else {
        if (!note.trim()) throw new Error('Write a comment first.');
        onComment(note.trim());
      }
      editor.view.focus(); onClose(popup.type !== 'image');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'The action could not be completed.'); }
  };
  return <Anchored editor={editor} anchor={popup.anchor} wide className="detail-panel">
    <form ref={ref} role="dialog" aria-label={isImage ? 'Image properties' : popup.type === 'link' ? 'Edit link' : 'Add comment'}
      onSubmit={event => { event.preventDefault(); save(); }} onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(true); }
        if (event.key !== 'Tab') return;
        const controls = Array.from(ref.current?.querySelectorAll<HTMLElement>('input,textarea,button:not(:disabled),a[href]') || []);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
      <div className="detail-heading"><strong>{isImage ? 'Image' : popup.type === 'link' ? 'Edit link' : 'Comment'}</strong>
        <button type="button" aria-label="Close popover" onClick={() => onClose(true)}>&times;</button></div>
      {popup.type === 'comment' ? <label>Comment<textarea rows={3} maxLength={10000} value={note} placeholder={'Leave a note on this block\u2026'} onChange={e => setNote(e.target.value)}/></label> : <>
        <label>{isImage ? 'Image URL' : 'Link URL'}<input value={url} onChange={e => { upload.current++; setBusy(false); setUrl(e.target.value); }} placeholder="https://..."/></label>
        {!isImage && safeLink(url) && <a href={safeLink(url)!} target="_blank" rel="noopener noreferrer">Open link preview</a>}
        {isImage && <>
          <label className="upload-label">Upload image<input aria-label="Upload local image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={async event => {
            const file = event.target.files?.[0]; if (!file) return;
            const token = ++upload.current; setBusy(true); setError('');
            try { const src = await imageToDataUrl(file); if (token === upload.current) setUrl(src); }
            catch (failure) { if (token === upload.current) setError(String(failure)); }
            finally { if (token === upload.current) setBusy(false); }
          }}/></label>
          <label>Caption<input value={caption} placeholder="Describe the image" onChange={e => setCaption(e.target.value)}/></label>
          <label>Alternative text<input value={alt} onChange={e => setAlt(e.target.value)}/></label>
          <label>Width &middot; {width}%<input aria-label="Image width" type="range" min={25} max={100} value={width} onChange={e => setWidth(Number(e.target.value))}/></label>
        </>}
      </>}
      {error && <p className="ux-error" role="alert">{error}</p>}
      <div className="detail-actions"><button type="button" onClick={() => onClose(true)}>Cancel</button>
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Reading image...' : popup.type === 'comment' ? 'Add comment' : 'Save'}</button></div>
    </form>
  </Anchored>;
}
