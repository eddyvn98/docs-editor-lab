import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import type { Anchor } from "./targets";
import { placeOverlay } from "./logic";

export function Anchored({ anchor, editor, children, className = "", wide = false }: {
  anchor: Anchor; editor: Editor; children: ReactNode; className?: string; wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [point, setPoint] = useState({ x: 0, y: 0, ready: false });
  useLayoutEffect(() => {
    let frame = 0;
    const refresh = () => {
      const panel = ref.current;
      if (!panel || editor.isDestroyed) return;
      let desired = anchor.point;
      const dom = anchor.pos === undefined ? null : editor.view.nodeDOM(anchor.pos);
      const element = anchor.element?.isConnected ? anchor.element : dom instanceof HTMLElement ? dom : null;
      let rect: { left: number; right: number; top: number; bottom: number } | null = null;
      try {
        if (anchor.mode === "selection" || anchor.mode === "caret") {
          const from = Math.min(anchor.from ?? editor.state.selection.from, editor.state.doc.content.size);
          const to = Math.min(anchor.to ?? from, editor.state.doc.content.size);
          const start = editor.view.coordsAtPos(Math.max(0, from));
          const end = editor.view.coordsAtPos(Math.max(0, to));
          rect = { left: Math.min(start.left, end.left), right: Math.max(start.right, end.right), top: start.top, bottom: end.bottom };
        } else if (element) rect = element.getBoundingClientRect();
      } catch { /* A target can disappear between a transaction and layout. */ }
      const viewport = window.visualViewport;
      const origin = { x: viewport?.offsetLeft || 0, y: viewport?.offsetTop || 0 };
      const width = viewport?.width || window.innerWidth;
      const height = viewport?.height || window.innerHeight;
      if (rect) {
        if (anchor.mode === "pointer") desired = { x: rect.left + (anchor.offset?.x || 0), y: rect.top + (anchor.offset?.y || 0) };
        else {
          const above = rect.top - panel.offsetHeight - 8;
          const below = rect.bottom + 8;
          const useAbove = anchor.mode === "selection" ? above >= origin.y + 8 : below + panel.offsetHeight > origin.y + height && above >= origin.y + 8;
          desired = { x: anchor.mode === "selection" ? (rect.left + rect.right - panel.offsetWidth) / 2 : rect.left,
            y: useAbove ? above : below };
        }
      }
      const next = placeOverlay({ x: desired.x - origin.x, y: desired.y - origin.y },
        { width: panel.offsetWidth, height: panel.offsetHeight }, { width, height });
      setPoint({ x: next.x + origin.x, y: next.y + origin.y, ready: true });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(refresh); };
    refresh();
    const observer = new ResizeObserver(schedule);
    if (ref.current) observer.observe(ref.current);
    observer.observe(editor.view.dom); observer.observe(document.body);
    editor.on("transaction", schedule);
    window.addEventListener("scroll", schedule, true); window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); editor.off("transaction", schedule);
      window.removeEventListener("scroll", schedule, true); window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
    };
  }, [anchor, editor]);
  return createPortal(<div ref={ref} data-ux-overlay className={`ux-floating ${wide ? "wide " : ""}${className}`}
    style={{ left: point.x, top: point.y, visibility: point.ready ? "visible" : "hidden", maxHeight: "calc(100dvh - 16px)", overflowY: "auto" }}>
    {children}
  </div>, document.body);
}
