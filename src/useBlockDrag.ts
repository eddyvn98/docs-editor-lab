import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointer } from 'react';
import type { Editor } from '@tiptap/react';
import { blockFromDOM } from './targets';
import type { Hover } from './targets';
import { moveBlock } from './actions';
import { BlockRangeSelection, rootBlock } from './docs-ui/blockSelection';
import { moveBlockRange, selectBlocks } from './docs-ui/blockBatchActions';

export function useBlockDrag(editor: Editor | null, hover: Hover | null, done: () => void) {
  const dragging = useRef(false), suppressClick = useRef(false), cleanup = useRef<() => void>(() => {});
  const [indicator, setIndicator] = useState<{ left: number; top: number; width: number } | null>(null);
  useEffect(() => () => cleanup.current(), []);
  const onPointerDown = (event: ReactPointer<HTMLElement>) => {
    if (!editor || !hover || !editor.isEditable || event.button !== 0) return;
    event.preventDefault(); cleanup.current(); suppressClick.current = false;
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      selectBlocks(editor, hover.pos, event.shiftKey); suppressClick.current = true; return;
    }
    const source = hover.pos, id = event.pointerId, selection = editor.state.selection;
    const range = selection instanceof BlockRangeSelection && source >= selection.from && source < selection.to
      ? { from: selection.from, to: selection.to } : null;
    const start = { x: event.clientX, y: event.clientY }, grip = event.currentTarget;
    grip.setPointerCapture?.(id); dragging.current = true;
    let moved = false, frame = 0, x = start.x, y = start.y, target: number | null = null;
    const locate = () => {
      const found = blockFromDOM(editor, document.elementFromPoint(x, y));
      if (!found) { target = null; setIndicator(null); return; }
      const root = range ? rootBlock(editor.state.doc, found.pos) : null;
      const pos = root?.from ?? found.pos, node = editor.state.doc.nodeAt(pos);
      const dom = range ? editor.view.nodeDOM(pos) : found.element;
      if (!(dom instanceof HTMLElement) || !node) { target = null; setIndicator(null); return; }
      const rect = dom.getBoundingClientRect(), after = y > rect.top + rect.height / 2;
      target = pos + (after ? node.nodeSize : 0);
      if (range && target >= range.from && target <= range.to) { setIndicator(null); return; }
      setIndicator({ left: rect.left, top: after ? rect.bottom : rect.top, width: rect.width });
    };
    const tick = () => {
      if (!dragging.current || !moved) return;
      if (y < 90) window.scrollBy(0, -12);
      else if (y > window.innerHeight - 70) window.scrollBy(0, 12);
      locate(); frame = requestAnimationFrame(tick);
    };
    const clear = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', cancel); window.removeEventListener('blur', cancel); window.removeEventListener('keydown', escape);
      editor.off('update', cancel);
      if (grip.hasPointerCapture?.(id)) grip.releasePointerCapture(id);
      dragging.current = false; setIndicator(null); document.body.classList.remove('ux-reordering'); cleanup.current = () => {};
    };
    const move = (next: PointerEvent) => {
      if (next.pointerId !== id) return;
      x = next.clientX; y = next.clientY;
      if (!moved && Math.hypot(x - start.x, y - start.y) > 7) {
        moved = true; suppressClick.current = true; document.body.classList.add('ux-reordering'); tick();
      }
    };
    const end = (next: PointerEvent) => {
      if (next.pointerId !== id) return;
      x = next.clientX; y = next.clientY; if (moved) locate();
      const destination = target; clear();
      if (moved && destination !== null && editor.isEditable) {
        if (range) moveBlockRange(editor, range.from, range.to, destination);
        else moveBlock(editor, source, destination);
      }
      if (moved) {
        setTimeout(() => { suppressClick.current = false; }, 0);
        done();
      }
    };
    const cancel = () => {
      suppressClick.current = moved; clear();
      if (moved) setTimeout(() => { suppressClick.current = false; }, 0);
      done();
    };
    const escape = (next: KeyboardEvent) => { if (next.key === 'Escape') { next.preventDefault(); cancel(); } };
    cleanup.current = clear;
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', cancel); window.addEventListener('keydown', escape);
    window.addEventListener('blur', cancel); editor.on('update', cancel);
  };
  return { dragging, suppressClick, indicator, onPointerDown };
}
