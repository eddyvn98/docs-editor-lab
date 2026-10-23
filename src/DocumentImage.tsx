import { useState, useRef } from 'react';
import type { PointerEvent as ReactPointer, CSSProperties } from 'react';
import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { mergeAttributes } from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';
import { clampImageWidth, safeImage } from './safety';
import { normalizeCrop, isCropped, imageCropStyle, croppedImageStyle } from './cropModel';
import { requestDocs } from './docsEvents';

function ImageFigure({ node, editor, selected, updateAttributes, getPos }: NodeViewProps) {
  const [preview, setPreview] = useState<number | null>(null), [ratio, setRatio] = useState(Number(node.attrs.imageRatio) || 1);
  const resizing = useRef<{ x: number; width: number; total: number; value: number } | null>(null);
  const crop = normalizeCrop(node.attrs.crop), cropped = isCropped(crop);
  const start = (event: ReactPointer<HTMLButtonElement>) => {
    if (event.button !== 0 || !editor.isEditable) return;
    event.preventDefault(); event.stopPropagation();
    const figure = event.currentTarget.closest('figure') as HTMLElement | null;
    const shell = figure?.querySelector<HTMLElement>('.image-shell');
    if (!figure || !shell) return;
    const total = figure.getBoundingClientRect().width; if (!total) return;
    resizing.current = { x: event.clientX, width: shell.getBoundingClientRect().width, total, value: parseFloat(clampImageWidth(node.attrs.width)) };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const src = safeImage(String(node.attrs.src || ''));
  return <NodeViewWrapper as="figure" data-block-id={node.attrs.blockId} className={`image-figure${selected ? ' is-selected' : ''}`}>
    <div className="image-shell" style={{ width: preview === null ? clampImageWidth(node.attrs.width) : `${preview}%` }}>
      <div className="image-crop-viewport" style={(cropped ? imageCropStyle(crop, ratio) : {}) as CSSProperties}>
        {src ? <img src={src} alt={String(node.attrs.alt || 'Document image')} draggable={false}
          style={(cropped ? croppedImageStyle(crop) : {}) as CSSProperties} onLoad={event => {
            const img = event.currentTarget; if (img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
          }}/> : <p>Image URL is unavailable</p>}
      </div>
      {editor.isEditable && <div className="image-inline-tools" data-node-controls contentEditable={false} onClick={event => event.stopPropagation()}>
        <button type="button" onClick={() => { const pos = getPos(); if (typeof pos === 'number') requestDocs(editor, { action: 'image-crop', pos }); }}>Crop</button>
        {cropped && <button type="button" onClick={() => updateAttributes({ crop: null })}>Reset crop</button>}
      </div>}
      <button type="button" contentEditable={false} className="resize-image" aria-label="Resize image" title="Drag or use arrow keys to resize"
        onPointerDown={start} onPointerMove={event => {
          const drag = resizing.current; if (!drag) return;
          drag.value = Math.max(25, Math.min(100, Math.round(100 * (drag.width + event.clientX - drag.x) / drag.total)));
          setPreview(drag.value);
        }} onPointerUp={event => {
          if (!resizing.current) return;
          if (editor.isEditable) updateAttributes({ width: `${resizing.current.value}%` });
          resizing.current = null; setPreview(null); event.currentTarget.releasePointerCapture(event.pointerId);
        }} onPointerCancel={() => { resizing.current = null; setPreview(null); }} onLostPointerCapture={() => { resizing.current = null; setPreview(null); }}
        onClick={event => event.stopPropagation()} onKeyDown={event => {
          if (!editor.isEditable || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
          event.preventDefault(); event.stopPropagation();
          updateAttributes({ width: clampImageWidth(parseFloat(clampImageWidth(node.attrs.width)) + (event.key === 'ArrowRight' ? 5 : -5)) });
        }}>{'\u2198'}</button>
    </div>
    <figcaption contentEditable={false}>{node.attrs.caption || 'Click to add a caption'}</figcaption>
  </NodeViewWrapper>;
}
function imageElement(element: HTMLElement): HTMLElement { return element.matches('img') ? element : element.querySelector('img') || element; }
function readCrop(element: HTMLElement) {
  try { return normalizeCrop(JSON.parse(element.getAttribute('data-crop') || 'null')); } catch { return normalizeCrop(null); }
}
export const DocumentImage = Image.extend({
  addAttributes() {
    return { ...this.parent?.(),
      src: { default: null, parseHTML: element => imageElement(element).getAttribute('src') },
      alt: { default: null, parseHTML: element => imageElement(element).getAttribute('alt') },
      title: { default: null, parseHTML: element => imageElement(element).getAttribute('title') },
      width: { default: '100%', parseHTML: element => clampImageWidth(element.getAttribute('data-width')),
        renderHTML: attrs => ({ 'data-width': clampImageWidth(attrs.width) }) },
      caption: { default: '', parseHTML: element => element.getAttribute('data-caption') || '',
        renderHTML: attrs => ({ 'data-caption': String(attrs.caption || '') }) },
      crop: { default: null, parseHTML: readCrop, renderHTML: attrs => ({ 'data-crop': JSON.stringify(normalizeCrop(attrs.crop)) }) },
      imageRatio: { default: 1, parseHTML: element => Math.max(0.01, Math.min(100, Number(element.getAttribute('data-image-ratio')) || 1)),
        renderHTML: attrs => ({ 'data-image-ratio': Math.max(0.01, Math.min(100, Number(attrs.imageRatio) || 1)) }) },
    };
  },
  parseHTML() { return [{ tag: 'figure[data-type="doc-image"]' }, ...(this.parent?.() || [])]; },
  renderHTML({ node, HTMLAttributes }) {
    const crop = normalizeCrop(node.attrs.crop), cropped = isCropped(crop), width = clampImageWidth(node.attrs.width);
    const style = (value: Record<string, string>) => Object.entries(value).map(([key, val]) => `${key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)}:${val}`).join(';');
    const { src, alt, title, ...figure } = HTMLAttributes;
    const image: DOMOutputSpec = ['img', { src: safeImage(String(src || '')) || '', alt: alt || '', title: title || '',
      style: cropped ? style(croppedImageStyle(crop)) : 'width:100%;height:auto;display:block' }];
    return ['figure', mergeAttributes(figure, { 'data-type': 'doc-image', class: 'image-figure', style: `margin:1em 0;width:${width}` }),
      ['div', { style: cropped ? style(imageCropStyle(crop, Number(node.attrs.imageRatio))) : '' }, image],
      ['figcaption', {}, String(node.attrs.caption || '')]];
  },
  addNodeView() { return ReactNodeViewRenderer(ImageFigure); },
});
