import { useRef, useState } from "react";
import type { PointerEvent as ReactPointer } from "react";
import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { clampImageWidth, safeImage } from "./safety";

function ImageFigure({ node, selected, updateAttributes }: NodeViewProps) {
  const [preview, setPreview] = useState<number | null>(null);
  const resizing = useRef<{ x: number; width: number; total: number; value: number } | null>(null);
  const start = (event: ReactPointer<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    const figure = event.currentTarget.closest("figure") as HTMLElement | null;
    const shell = figure?.querySelector<HTMLElement>(".image-shell");
    if (!figure || !shell) return;
    const total = figure.getBoundingClientRect().width;
    if (!total) return;
    resizing.current = { x: event.clientX, width: shell.getBoundingClientRect().width, total, value: parseFloat(clampImageWidth(node.attrs.width)) };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const src = safeImage(String(node.attrs.src || ""));
  return <NodeViewWrapper as="figure" data-block-id={node.attrs.blockId} className={`image-figure${selected ? " is-selected" : ""}`}>
    <div className="image-shell" style={{ width: preview === null ? clampImageWidth(node.attrs.width) : `${preview}%` }}>
      {src ? <img src={src} alt={String(node.attrs.alt || "Document image")} draggable={false}/> : <p>Image URL is unavailable</p>}
      <button type="button" contentEditable={false} className="resize-image" aria-label="Resize image" title="Drag or use arrow keys to resize"
        onPointerDown={start} onPointerMove={event => {
          const drag = resizing.current; if (!drag) return;
          drag.value = Math.max(25, Math.min(100, Math.round(100 * (drag.width + event.clientX - drag.x) / drag.total)));
          setPreview(drag.value);
        }} onPointerUp={event => {
          if (!resizing.current) return;
          updateAttributes({ width: `${resizing.current.value}%` }); resizing.current = null; setPreview(null);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }} onPointerCancel={() => { resizing.current = null; setPreview(null); }}
        onLostPointerCapture={() => { resizing.current = null; setPreview(null); }} onClick={event => event.stopPropagation()}
        onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
          event.preventDefault(); event.stopPropagation();
          updateAttributes({ width: clampImageWidth(parseFloat(clampImageWidth(node.attrs.width)) + (event.key === "ArrowRight" ? 5 : -5)) });
        }}>↘</button>
    </div>
    <figcaption contentEditable={false}>{node.attrs.caption || "Click to add a caption"}</figcaption>
  </NodeViewWrapper>;
}
export const DocumentImage = Image.extend({
  addAttributes() {
    return { ...this.parent?.(),
      width: { default: "100%", parseHTML: (el: HTMLElement) => clampImageWidth(el.getAttribute("data-width")),
        renderHTML: (attrs: Record<string, unknown>) => ({ "data-width": clampImageWidth(attrs.width), style: `width:${clampImageWidth(attrs.width)}` }) },
      caption: { default: "", parseHTML: (el: HTMLElement) => el.getAttribute("data-caption") || "",
        renderHTML: (attrs: Record<string, unknown>) => ({ "data-caption": attrs.caption }) },
    };
  },
  addNodeView() { return ReactNodeViewRenderer(ImageFigure); },
});
