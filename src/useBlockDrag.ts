import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointer } from "react";
import type { Editor } from "@tiptap/react";
import { blockFromDOM } from "./targets";
import type { Hover } from "./targets";
import { moveBlock } from "./actions";

export function useBlockDrag(editor: Editor | null, hover: Hover | null, done: () => void) {
  const dragging = useRef(false);
  const suppressClick = useRef(false);
  const cleanup = useRef<() => void>(() => {});
  const [indicator, setIndicator] = useState<{ left: number; top: number; width: number } | null>(null);
  useEffect(() => () => cleanup.current(), []);
  const onPointerDown = (event: ReactPointer<HTMLElement>) => {
    if (!editor || !hover || event.button !== 0) return;
    event.preventDefault(); cleanup.current(); suppressClick.current = false;
    const source = hover.pos, id = event.pointerId;
    const start = { x: event.clientX, y: event.clientY };
    const grip = event.currentTarget;
    grip.setPointerCapture?.(id);
    dragging.current = true;
    let moved = false, frame = 0, x = start.x, y = start.y, target: number | null = null;
    const locate = () => {
      const found = blockFromDOM(editor, document.elementFromPoint(x, y));
      if (!found) { target = null; setIndicator(null); return; }
      const node = editor.state.doc.nodeAt(found.pos);
      const rect = found.element.getBoundingClientRect();
      const after = y > rect.top + rect.height / 2;
      target = found.pos + (after ? node?.nodeSize || 0 : 0);
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
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", cancel); window.removeEventListener("blur", cancel);
      window.removeEventListener("keydown", escape);
      editor.off("update", cancel);
      if (grip.hasPointerCapture?.(id)) grip.releasePointerCapture(id);
      dragging.current = false; setIndicator(null); document.body.classList.remove("ux-reordering");
      cleanup.current = () => {};
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      x = e.clientX; y = e.clientY;
      if (!moved && Math.hypot(x - start.x, y - start.y) > 7) {
        moved = true; suppressClick.current = true; document.body.classList.add("ux-reordering"); tick();
      }
    };
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      x = e.clientX; y = e.clientY;
      if (moved) locate();
      const destination = target;
      clear();
      if (moved && destination !== null) moveBlock(editor, source, destination);
      if (moved) done();
    };
    const cancel = () => { suppressClick.current = moved; clear(); done(); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); cancel(); } };
    cleanup.current = clear;
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", cancel); window.addEventListener("keydown", escape);
    window.addEventListener("blur", cancel); editor.on("update", cancel);
  };
  return { dragging, suppressClick, indicator, onPointerDown };
}
