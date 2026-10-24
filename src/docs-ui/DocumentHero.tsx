import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ImagePlus, Smile, Upload, X } from 'lucide-react';
import { ModalSurface } from '../ModalSurface';
import { useEditorPulse } from '../useEditorPulse';
import { safeImage } from '../safety';
import { covers, metadata, updateMetadata } from './DocumentMetadata';
import { t } from './locale';
const icons = ['\u{1f4c4}', '\u{1f4dd}', '\u{1f4cb}', '\u{1f4ca}', '\u{1f4a1}', '\u{1f680}', '\u{1f3af}', '\u{1f4d8}', '\u{1f331}', '\u{2728}', '\u{1f4cc}', '\u{1f4c5}', '\u{1f393}', '\u{1f527}', '\u{1f30f}', '\u{2705}'];
export function DocumentHero({ editor, title, onTitle, status }: {
  editor: Editor; title: string; onTitle: (value: string) => void; status: string;
}) {
  useEditorPulse(editor);
  const data = metadata(editor), readOnly = !editor.isEditable;
  const [picker, setPicker] = useState<'icon' | 'cover' | null>(null), [error, setError] = useState('');
  const [reposition, setReposition] = useState(false), [position, setPosition] = useState(data.coverPosition);
  const input = useRef<HTMLTextAreaElement>(null), mounted = useRef(true), drag = useRef<{ y: number; position: number } | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (readOnly) { setPicker(null); setReposition(false); } }, [readOnly]);
  useLayoutEffect(() => {
    const element = input.current; if (!element) return;
    const resize = () => { element.style.height = '0px'; element.style.height = `${element.scrollHeight}px`; };
    resize(); let width = element.clientWidth; const observer = new ResizeObserver(() => { if (element.clientWidth !== width) { width = element.clientWidth; resize(); } }); observer.observe(element); return () => observer.disconnect();
  }, [title]);
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type) || file.size > 1_500_000) { setError('Choose a PNG, JPEG, WebP or GIF under 1.5 MB.'); return; }
    const id = editor.state.doc.attrs.docsId;
    try {
      const source = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error('Image could not be read.')); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); });
      if (!mounted.current || editor.isDestroyed || !editor.isEditable || editor.state.doc.attrs.docsId !== id) return;
      updateMetadata(editor, { cover: source, coverPosition: 50 }); setPicker(null);
    } catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'Upload failed.'); }
  };
  const source = safeImage(data.cover), gradient = covers[data.cover];
  const date = data.updatedAt && Number.isFinite(Date.parse(data.updatedAt)) ? new Date(data.updatedAt) : null;
  return <header className={`docs-hero ${data.cover ? 'has-cover' : ''}`}>
    {data.cover && <div className={`docs-cover ${reposition ? 'is-repositioning' : ''}`}
      style={gradient ? { background: gradient } : undefined}
      onPointerDown={event => { if (!reposition || (event.target as Element).closest('button,input')) return; drag.current = { y: event.clientY, position }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={event => { if (drag.current) setPosition(Math.max(0, Math.min(100, drag.current.position - (event.clientY - drag.current.y) / 2))); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      {!gradient && source && <img src={source} alt="" style={{ objectPosition: `center ${reposition ? position : data.coverPosition}%` }} draggable={false}/>}
      {!readOnly && <div className="docs-cover-actions" data-node-controls>
        {reposition ? <><label className="sr-only" htmlFor="cover-position">Cover position</label><input id="cover-position" type="range" min="0" max="100" value={position} onChange={event => setPosition(Number(event.target.value))}/>
          <button onClick={() => { updateMetadata(editor, { coverPosition: position }); setReposition(false); }}>{t('Save')}</button><button onClick={() => setReposition(false)}>{t('Cancel')}</button></>
          : <><button onClick={() => { setError(''); setPicker('cover'); }}>{t('Change cover')}</button><button onClick={() => { setPosition(data.coverPosition); setReposition(true); }}>{t('Reposition')}</button>
            <button aria-label="Remove cover" onClick={() => updateMetadata(editor, { cover: '' })}><X size={14}/></button></>}
      </div>}
    </div>}
    <div className="docs-title-area">
      {data.icon && <button className="docs-document-icon" aria-label="Document icon" disabled={readOnly} onClick={() => setPicker('icon')}>{data.icon}</button>}
      {!readOnly && <div className="docs-title-actions">
        {!data.icon && <button onClick={() => setPicker('icon')}><Smile size={15}/>{t('Add icon')}</button>}
        {!data.cover && <button onClick={() => { setError(''); setPicker('cover'); }}><ImagePlus size={15}/>{t('Add cover')}</button>}
      </div>}
      <textarea ref={input} className="document-title title-input" aria-label="Document title" rows={1} maxLength={200} value={title}
        readOnly={readOnly} placeholder={t('Untitled')} onChange={event => onTitle(event.target.value.replace(/\n/g, ' '))}
        onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); editor.commands.focus('start'); } }}
        onBlur={() => { if (!readOnly && !title.trim()) onTitle(t('Untitled')); }}/>
      <div className="docs-author-line"><span className="docs-avatar" aria-hidden="true">Y</span><span>{t('You')}</span><span className="docs-meta-divider"/>
        <span title={date?.toLocaleString()}>{date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : t('Local document')}</span>
        <span className="docs-meta-divider"/><span className="docs-hero-status">{t(status)}</span></div>
    </div>
    {picker && <ModalSurface title={picker === 'icon' ? 'Document icon' : 'Document cover'} onClose={() => setPicker(null)} className="docs-identity-dialog">
      {picker === 'icon' ? <><div className="docs-emoji-grid">{icons.map(icon => <button key={icon} aria-label={`Use ${icon}`} onClick={() => { updateMetadata(editor, { icon }); setPicker(null); }}>{icon}</button>)}</div>
        <button className="docs-text-button" onClick={() => { updateMetadata(editor, { icon: '' }); setPicker(null); }}>{t('Remove')}</button></>
        : <><div className="docs-cover-swatches">{Object.entries(covers).map(([name, background]) => <button key={name} aria-label={`${name} cover`} style={{ background }} onClick={() => { updateMetadata(editor, { cover: name }); setPicker(null); }}/>)}</div>
          <label className="docs-upload-button"><Upload size={16}/>{t('Upload')}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }}/></label>
          <p className="docs-muted">PNG, JPEG, WebP, GIF. Maximum 1.5 MB.</p></>}
      {error && <p role="alert">{error}</p>}
    </ModalSurface>}
  </header>;
}
