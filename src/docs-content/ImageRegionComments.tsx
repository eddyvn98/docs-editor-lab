import { useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { CSSProperties } from 'react';
import { MessageSquarePlus, Send, X } from 'lucide-react';
import type { Comment } from '../comments';
import { normalizeCrop } from '../cropModel';
import type { Crop } from '../cropModel';
import { imageCommentsFor, imageSourceKey } from './imageCommentModel';
import { useEditorPulse } from '../useEditorPulse';
import { t, useDocsLocale } from '../docs-ui/locale';
import { Anchored } from '../Anchored';
export function ImageRegionComments({ editor, blockId, source, crop: value }: { editor: Editor; blockId: string; source: string; crop: unknown }) {
  useEditorPulse(editor); useDocsLocale();
  const [comments, setComments] = useState<Comment[]>(() => imageCommentsFor(editor)), [drawing, setDrawing] = useState(false), [region, setRegion] = useState<Crop | null>(null), [note, setNote] = useState(''), [active, setActive] = useState('');
  const layer = useRef<HTMLDivElement>(null), start = useRef<{ x: number; y: number } | null>(null);
  const crop = normalizeCrop(value), key = useMemo(() => imageSourceKey(source), [source]);
  useEffect(() => {
    const begin = (event: Event) => { if (editor.isEditable && (event as CustomEvent).detail === blockId) { setDrawing(true); setRegion(null); } };
    const changed = () => setComments(imageCommentsFor(editor)), focus = (event: Event) => setActive(String((event as CustomEvent).detail));
    editor.view.dom.addEventListener('docs-start-image-comment', begin); editor.view.dom.addEventListener('docs-comments-change', changed); editor.view.dom.addEventListener('docs-focus-image-comment', focus);
    return () => { editor.view.dom.removeEventListener('docs-start-image-comment', begin); editor.view.dom.removeEventListener('docs-comments-change', changed); editor.view.dom.removeEventListener('docs-focus-image-comment', focus); };
  }, [editor, blockId]);
  useEffect(() => { if (!editor.isEditable) { setDrawing(false); setRegion(null); } }, [editor.isEditable]);
  useEffect(() => { setDrawing(false); setRegion(null); }, [key]);
  const point = (event: { clientX: number; clientY: number }) => {
    const rect = layer.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(100, (event.clientX - rect.left) / Math.max(1, rect.width) * 100)), y: Math.max(0, Math.min(100, (event.clientY - rect.top) / Math.max(1, rect.height) * 100)) };
  };
  const style = (r: Crop): CSSProperties => ({ left: `${r.x}%`, top: `${r.y}%`, width: `${r.width}%`, height: `${r.height}%` });
  const visible = comments.filter(comment => !comment.resolved && comment.image?.blockId === blockId && comment.image.sourceKey === key);
  const submit = () => {
    if (!editor.isEditable || !region || !note.trim()) return;
    editor.view.dom.dispatchEvent(new CustomEvent('docs-add-image-comment', { detail: { text: note.trim(), image: { blockId, sourceKey: key, x: crop.x + region.x * crop.width / 100, y: crop.y + region.y * crop.height / 100, width: region.width * crop.width / 100, height: region.height * crop.height / 100 } } }));
    setRegion(null); setNote(''); setDrawing(false);
  };
  return <>
    <div ref={layer} className={`docs-image-regions ${drawing ? 'is-drawing' : ''}`} contentEditable={false} data-node-controls
      onPointerDown={event => { if (!drawing || (event.target as Element).closest('button,textarea')) return; event.preventDefault(); start.current = point(event); setRegion({ ...start.current, width: 1, height: 1 }); event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={event => { if (!start.current) return; const end = point(event); setRegion({ x: Math.min(start.current.x, end.x), y: Math.min(start.current.y, end.y), width: Math.max(1, Math.abs(end.x - start.current.x)), height: Math.max(1, Math.abs(end.y - start.current.y)) }); }}
      onPointerUp={event => { if (!start.current) return; start.current = null; setDrawing(false); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      onPointerCancel={() => { start.current = null; setRegion(null); setDrawing(false); }}>
      {visible.map((comment, index) => {
        const r = comment.image!, left = Math.max(crop.x, r.x), top = Math.max(crop.y, r.y), right = Math.min(crop.x + crop.width, r.x + r.width), bottom = Math.min(crop.y + crop.height, r.y + r.height);
        if (right <= left || bottom <= top) return null;
        return <button key={comment.id} className={`docs-image-region ${active === comment.id ? 'is-active' : ''}`} style={style({ x: 100 * (left - crop.x) / crop.width, y: 100 * (top - crop.y) / crop.height, width: 100 * (right - left) / crop.width, height: 100 * (bottom - top) / crop.height })} aria-label={`Image comment ${index + 1}: ${comment.text}`} onClick={() => { setActive(comment.id); editor.view.dom.dispatchEvent(new CustomEvent('docs-open-comment', { detail: comment.id })); }}><span>{index + 1}</span></button>;
      })}
      {region && <span className="docs-image-region is-draft" style={style(region)}/>}
    </div>
    {editor.isEditable && !drawing && !region && <button className="docs-image-comment-trigger" contentEditable={false} data-node-controls aria-label="Comment on image region" title={t('Comment on image')} onClick={event => { event.stopPropagation(); setDrawing(true); }}><MessageSquarePlus size={16}/></button>}
    {drawing && <div className="docs-image-draw-hint" data-node-controls contentEditable={false}>{t('Drag to select an image region')}<button onClick={() => { setRegion({ x: 0, y: 0, width: 100, height: 100 }); setDrawing(false); }}>{t('Whole image')}</button><button aria-label="Cancel image comment" onClick={() => { setDrawing(false); setRegion(null); }}><X size={14}/></button></div>}
    {region && !drawing && <Anchored editor={editor} anchor={{ element: layer.current, point: { x: 0, y: 0 }, mode: 'element' }} className="docs-image-comment-popover"><div className="docs-image-comment-form" data-node-controls contentEditable={false} role="dialog" aria-label="Image comment" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setRegion(null); } if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') submit(); }}>
      <textarea autoFocus aria-label="Image comment text" placeholder={t('Add a comment')} maxLength={10000} value={note} onChange={event => setNote(event.target.value)}/><div><button onClick={() => setRegion(null)}>{t('Cancel')}</button><button className="docs-primary" disabled={!note.trim()} onClick={submit}><Send size={14}/>{t('Comment')}</button></div>
    </div></Anchored>}
  </>;
}
