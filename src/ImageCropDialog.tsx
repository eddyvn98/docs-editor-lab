import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import type { Editor } from '@tiptap/react';
import type { Transaction } from '@tiptap/pm/state';
import { ModalSurface } from './ModalSurface';
import { normalizeCrop, fullCrop, dragCrop } from './cropModel';
import type { Crop } from './cropModel';
import { safeImage } from './safety';
import { positionById } from './BlockIdentity';

export function ImageCropDialog({ editor, position, onClose }: { editor: Editor; position: number; onClose: () => void }) {
  const [original] = useState(() => position >= 0 && position < editor.state.doc.content.size ? editor.state.doc.nodeAt(position) : null);
  const pos = useRef(position), stage = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState(() => normalizeCrop(original?.attrs.crop));
  const [ratio, setRatio] = useState(Number(original?.attrs.imageRatio) || 1);
  const [ready, setReady] = useState(false), [error, setError] = useState('');
  const drag = useRef<{ start: Crop; x: number; y: number; width: number; height: number; mode: 'move' | 'resize' } | null>(null);
  const src = safeImage(String(original?.attrs.src || ''));
  useEffect(() => {
    const map = ({ transaction }: { transaction: Transaction }) => {
      const id = original?.attrs.blockId;
      if (id) pos.current = positionById(editor, String(id)) ?? -1;
      else if (pos.current >= 0) { const mapped = transaction.mapping.mapResult(pos.current, 1); pos.current = mapped.deleted ? -1 : mapped.pos; }
    };
    editor.on('transaction', map); return () => { editor.off('transaction', map); };
  }, [editor]);
  const start = (event: PointerEvent<HTMLElement>, mode: 'move' | 'resize') => {
    if (event.button !== 0 || !ready) return;
    const rect = stage.current?.getBoundingClientRect(); if (!rect?.width || !rect.height) return;
    event.preventDefault(); event.stopPropagation();
    drag.current = { start: crop, x: event.clientX, y: event.clientY, width: rect.width, height: rect.height, mode };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLElement>) => {
    const active = drag.current; if (!active) return;
    setCrop(dragCrop(active.start, (event.clientX - active.x) * 100 / active.width,
      (event.clientY - active.y) * 100 / active.height, active.mode));
  };
  const end = (event: PointerEvent<HTMLElement>) => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const save = () => {
    const node = pos.current >= 0 && pos.current <= editor.state.doc.content.size ? editor.state.doc.nodeAt(pos.current) : null;
    if (!editor.isEditable || node?.type.name !== 'image' || node.attrs.src !== original?.attrs.src) {
      setError('This image changed or was removed. Close the dialog and choose it again.'); return;
    }
    editor.view.dispatch(editor.state.tr.setNodeMarkup(pos.current, undefined, { ...node.attrs, crop: normalizeCrop(crop), imageRatio: ratio }));
    onClose();
  };
  return <ModalSurface title="Crop image" onClose={onClose} className="crop-dialog">
    <p className="dialog-hint">Drag the rectangle to move it; drag its corner to resize. The original file is preserved.</p>
    <div ref={stage} className="crop-stage" style={{ width: `min(100%, ${52 * ratio}dvh)` } as CSSProperties}>
      {src && <img src={src} draggable={false} alt={String(original?.attrs.alt || 'Image to crop')}
        onLoad={event => { const img = event.currentTarget; if (img.naturalWidth && img.naturalHeight) { setRatio(img.naturalWidth / img.naturalHeight); setReady(true); } }}
        onError={() => { setReady(false); setError('The image cannot be loaded. No changes have been applied.'); }}
      />}
      {ready && <div className="crop-window" style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.width}%`, height: `${crop.height}%` }}
        onPointerDown={event => start(event, 'move')} onPointerMove={move} onPointerUp={end} onLostPointerCapture={() => { drag.current = null; }}
        onPointerCancel={event => { if (drag.current) setCrop(drag.current.start); end(event); }}>
        <button type="button" className="crop-grip" aria-label="Resize crop" onPointerDown={event => start(event, 'resize')}
          onPointerMove={move} onPointerUp={end} onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
            event.preventDefault();
            setCrop(dragCrop(crop, event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0,
              event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0, 'resize'));
          }} />
      </div>}
    </div>
    <fieldset className="crop-values"><legend>Crop bounds (%)</legend>{(['x', 'y', 'width', 'height'] as const).map(key =>
      <label key={key}>{key}<input type="number" aria-label={`Crop ${key}`} min={key === 'x' || key === 'y' ? 0 : 10} max={100} step={1}
        value={crop[key]} onChange={event => setCrop(normalizeCrop({ ...crop, [key]: Number(event.target.value) }))}/></label>)}</fieldset>
    {error && <p role="alert">{error}</p>}
    <div className="dialog-actions"><button type="button" onClick={() => setCrop(fullCrop)}>Reset crop</button>
      <button type="button" onClick={onClose}>Cancel</button><button type="button" disabled={!ready} onClick={save}>Apply crop</button></div>
  </ModalSurface>;
}
