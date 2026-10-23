import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { positionById } from "../BlockIdentity";
import { Modal } from "./Modal";
import { aspectCrop, FULL_CROP, MIN_CROP, normalizeCrop, pixelCrop } from "./cropGeometry";
import type { Crop } from "./cropGeometry";

export type ImageTarget = { pos: number; id: string };
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (/^https?:/i.test(src)) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This image cannot be loaded for cropping. Upload the original file locally and try again."));
    image.src = src;
  });
}
export function ImageTools({ editor, target, onClose }: { editor: Editor; target: ImageTarget; onClose: () => void }) {
  const pos = target.id ? positionById(editor, target.id) : target.pos;
  const node = pos !== null ? editor.state.doc.nodeAt(pos) : null;
  const [original] = useState(() => node?.type.name === "image" ? String(node.attrs.src || "") : "");
  const [crop, setCrop] = useState<Crop>({ ...FULL_CROP });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [cropping, setCropping] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [naturalSize, setNaturalSize] = useState(false);
  const alive = useRef(true);
  const drag = useRef<{ x: number; y: number; crop: Crop; width: number; height: number } | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const apply = async () => {
    if (busy || !original || !editor.isEditable) return;
    setBusy(true); setError("");
    try {
      const image = await loadImage(original);
      if (!alive.current) return;
      const region = pixelCrop(crop, image.naturalWidth, image.naturalHeight);
      const scale = Math.min(1, 4096 / Math.max(region.width, region.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(region.width * scale)); canvas.height = Math.max(1, Math.round(region.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas image processing is unavailable in this browser.");
      context.drawImage(image, region.x, region.y, region.width, region.height, 0, 0, canvas.width, canvas.height);
      let result: string;
      try { result = canvas.toDataURL("image/png"); }
      catch { throw new Error("The image host blocks cropping. Upload the original image locally first."); }
      if (result.length > 2_000_000) throw new Error("The cropped image is too large for local storage. Choose a smaller crop or use a smaller source image.");
      if (!alive.current || editor.isDestroyed) return;
      const currentPos = target.id ? positionById(editor, target.id) : target.pos;
      const currentNode = currentPos !== null ? editor.state.doc.nodeAt(currentPos) : null;
      if (currentPos === null || currentNode?.type.name !== "image" || currentNode.attrs.src !== original) throw new Error("The original image changed or was removed. Reopen image tools.");
      if (!editor.isEditable) throw new Error("Return to editing mode to apply the crop.");
      editor.view.dispatch(editor.state.tr.setNodeMarkup(currentPos, undefined, { ...currentNode.attrs, src: result }));
      onClose(); editor.commands.focus();
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : "Image could not be cropped."); }
    finally { if (alive.current) setBusy(false); }
  };
  return <Modal title="Image preview and crop" onClose={onClose} className="image-tools-dialog">
    <div className="image-tools-options">
      <button type="button" aria-pressed={naturalSize} onClick={() => setNaturalSize(!naturalSize)}>{naturalSize ? "Fit image" : "Actual size"}</button>
      {editor.isEditable && <button type="button" aria-pressed={cropping} onClick={() => setCropping(!cropping)}>Crop image</button>}
      <span>{dimensions.width > 0 ? `${dimensions.width} x ${dimensions.height} px` : "Loading image..."}</span>
    </div>
    <div className="image-preview-scroll">
      <div className={`crop-surface ${naturalSize ? "natural-size" : ""}`}>
        {original && <img src={original} alt={String(node?.attrs.alt || "Document image preview")} draggable={false}
          onLoad={event => setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
          onError={() => setError("The image is unavailable. Its URL may be offline or no longer valid.")}/>}
        {cropping && dimensions.width > 0 && <div className="crop-box" role="group" tabIndex={0} aria-label="Crop region. Drag to move or use arrow keys."
          style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.width}%`, height: `${crop.height}%` }}
          onPointerDown={event => {
            event.preventDefault(); const rect = event.currentTarget.parentElement!.getBoundingClientRect();
            drag.current = { x: event.clientX, y: event.clientY, crop, width: rect.width, height: rect.height };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={event => {
            const start = drag.current; if (!start) return;
            setCrop(normalizeCrop({ ...start.crop, x: start.crop.x + (event.clientX - start.x) * 100 / start.width,
              y: start.crop.y + (event.clientY - start.y) * 100 / start.height }));
          }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
          onKeyDown={event => {
            const steps: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
            const change = steps[event.key]; if (!change) return;
            event.preventDefault(); const speed = event.shiftKey ? 5 : 1;
            setCrop(normalizeCrop({ ...crop, x: crop.x + change[0] * speed, y: crop.y + change[1] * speed }));
          }}><span>Crop</span></div>}
      </div>
    </div>
    {cropping && <section className="crop-controls" aria-label="Crop controls">
      <div className="crop-presets">
        <button type="button" onClick={() => setCrop({ ...FULL_CROP })}>Reset</button>
        {[["Square", 1], ["4:3", 4 / 3], ["16:9", 16 / 9]] .map(([name, ratio]) =>
          <button type="button" key={name} onClick={() => setCrop(aspectCrop(dimensions.width, dimensions.height, Number(ratio)))}>{name}</button>)}
      </div>
      <div className="crop-sliders">{(["x", "y", "width", "height"] as const).map(key => <label key={key}>
        {key} {Math.round(crop[key])}%<input type="range" aria-label={`Crop ${key}`} min={key === "x" || key === "y" ? 0 : MIN_CROP} max={100} step={0.1}
          value={crop[key]} onChange={event => setCrop(normalizeCrop({ ...crop, [key]: Number(event.target.value) }))}/>
      </label>)}</div>
      <small>Crop creates a local PNG; Undo restores the original. Large crops are resized to a maximum of 4096 px.</small>
    </section>}
    {error && <p className="feature-error" role="alert">{error}</p>}
    <footer className="feature-dialog-actions"><button type="button" onClick={onClose}>Close</button>
      {cropping && <button type="button" className="primary" disabled={busy || !dimensions.width || !editor.isEditable} onClick={() => { void apply(); }}>{busy ? "Applying..." : "Apply crop"}</button>}
    </footer>
  </Modal>;
}
