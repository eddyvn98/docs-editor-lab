import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import { BlockRangeSelection } from './blockSelection';

/** Drag the document's left rail; text dragging keeps native text selection. */
export function useBlockMarquee(editor: Editor | null, frame: RefObject<HTMLDivElement>, readOnly: boolean) {
  useEffect(() => {
    const element = frame.current;
    if (!editor || !element || readOnly) return;
    let cleanup = () => {}, suppressClick = false;
    const click = (event: MouseEvent) => {
      if (suppressClick) { suppressClick = false; event.preventDefault(); event.stopImmediatePropagation(); }
    };
    const start = (event: PointerEvent) => {
      if (event.button !== 0 || event.pointerType === 'touch' || !editor.isEditable) return;
      const target = event.target;
      if (!(target instanceof Element) || target.closest('button,input,textarea,a,[data-node-controls]')) return;
      const bounds = editor.view.dom.getBoundingClientRect();
      if (event.clientX >= bounds.left - 2 || event.clientX < bounds.left - 34) return;
      const blocks: { from: number; to: number; element: HTMLElement }[] = [];
      editor.state.doc.forEach((node, pos) => {
        const dom = editor.view.nodeDOM(pos);
        if (dom instanceof HTMLElement && dom.getClientRects().length) blocks.push({ from: pos, to: pos + node.nodeSize, element: dom });
      });
      if (!blocks.length) return;
      const hit = (y: number) => blocks.find(block => block.element.getBoundingClientRect().bottom >= y) || blocks[blocks.length - 1];
      const first = hit(event.clientY), original = editor.state.selection;
      const anchor = event.shiftKey && original instanceof BlockRangeSelection ? original.from : first.from;
      let y = event.clientY, raf = 0, live = true;
      event.preventDefault(); cleanup(); suppressClick = true;
      element.setPointerCapture(event.pointerId);
      const update = () => {
        if (!live || editor.isDestroyed || !editor.isEditable) return;
        const last = hit(y);
        const from = Math.min(anchor, last.from), to = Math.max(first.to, last.to);
        const selection = BlockRangeSelection.create(editor.state.doc, from, to);
        if (!selection.eq(editor.state.selection)) editor.view.dispatch(editor.state.tr.setSelection(selection));
        if (y < 80) window.scrollBy(0, -10);
        if (y > window.innerHeight - 50) window.scrollBy(0, 10);
        raf = requestAnimationFrame(update);
      };
      const move = (next: PointerEvent) => { if (next.pointerId === event.pointerId) y = next.clientY; };
      const stop = () => {
        live = false; cancelAnimationFrame(raf);
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', stop); window.removeEventListener('blur', stop); window.removeEventListener('keydown', escape);
        editor.off('update', stop);
        if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
        cleanup = () => {};
      };
      const end = (next: PointerEvent) => { if (next.pointerId === event.pointerId) { stop(); editor.view.focus(); } };
      const escape = (next: KeyboardEvent) => { if (next.key === 'Escape') { stop(); editor.view.dispatch(editor.state.tr.setSelection(original)); } };
      cleanup = stop;
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', stop); window.addEventListener('blur', stop); window.addEventListener('keydown', escape);
      editor.on('update', stop); update();
    };
    element.addEventListener('pointerdown', start, true); element.addEventListener('click', click, true);
    return () => { cleanup(); element.removeEventListener('pointerdown', start, true); element.removeEventListener('click', click, true); };
  }, [editor, frame, readOnly]);
}
