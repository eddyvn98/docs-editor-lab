import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ModalSurface } from './ModalSurface';
import { useEditorPulse } from './useEditorPulse';
import { ImageTools } from './features/ImageTools';
import type { ImageTarget } from './features/ImageTools';
export function ImageLightbox({ editor, position, onClose }: { editor: Editor; position: number; onClose: () => void }) {
  useEditorPulse(editor);
  const images: { pos: number; src: string; alt: string; caption: string }[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'image') images.push({ pos, src: String(node.attrs.src || ''), alt: String(node.attrs.alt || ''), caption: String(node.attrs.caption || '') });
  });
  const [index, setIndex] = useState(Math.max(0, images.findIndex(image => image.pos === position)));
  const [zoom, setZoom] = useState(100), [failed, setFailed] = useState(false);
  const [cropTarget, setCropTarget] = useState<ImageTarget | null>(null);
  const at = Math.min(index, Math.max(0, images.length - 1)), image = images[at];
  const navigate = (delta: number) => { setIndex(current => Math.min(images.length - 1, Math.max(0, current + delta))); setZoom(100); setFailed(false); };
  if (cropTarget) return <ImageTools editor={editor} target={cropTarget} onClose={() => setCropTarget(null)}/>;
  return <ModalSurface title="Image viewer" onClose={onClose} className="image-lightbox">
    <div onKeyDown={event => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); navigate(event.key === 'ArrowLeft' ? -1 : 1); }
    }}>
      <div className="lightbox-controls">
        <button disabled={at === 0} onClick={() => navigate(-1)}>Previous</button><span>{images.length ? at + 1 : 0} / {images.length}</span>
        <button disabled={at >= images.length - 1} onClick={() => navigate(1)}>Next</button>
        <label>Zoom<input aria-label="Image zoom" type="range" min={50} max={250} step={10} value={zoom} onChange={event => setZoom(Number(event.target.value))}/></label>
        <button onClick={() => setZoom(100)}>Reset ({zoom}%)</button>
        {editor.isEditable && image && <button onClick={() => setCropTarget({ pos: image.pos,
          id: String(editor.state.doc.nodeAt(image.pos)?.attrs.blockId || '') })}>Crop image</button>}
      </div>
      <div className="lightbox-stage" tabIndex={0} aria-label="Image preview; scroll to inspect when zoomed">
        {image && !failed ? <img key={image.src} src={image.src} alt={image.alt || 'Document image'} style={{ transform: `scale(${zoom / 100})` }} onError={() => setFailed(true)}/>
          : <p role="status">This image cannot be displayed. Its reference is retained in the document.</p>}
      </div>
      {image && <p className="lightbox-caption">{image.caption || image.alt || 'No caption'}</p>}
    </div>
  </ModalSurface>;
}
