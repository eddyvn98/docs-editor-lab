import { useLayoutEffect, useState } from "react";
import type { PointerEvent } from "react";
import type { Hover } from "./targets";
export function Gutter({ hover, onMenu, onInsert, onPointerDown, onLeave, onEnter }: {
  hover: Hover | null; onMenu: () => void; onInsert: () => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void; onLeave?: () => void; onEnter?: () => void;
}) {
  const [point, setPoint] = useState({ left: -100, top: -100 });
  useLayoutEffect(() => {
    if (!hover) return;
    const refresh = () => {
      const rect = hover.element.getBoundingClientRect();
      setPoint({ left: Math.max(4, rect.left - 56), top: rect.top + Math.min(8, Math.max(0, rect.height - 30)) });
    };
    refresh(); window.addEventListener("scroll", refresh, true); window.addEventListener("resize", refresh);
    const observer = new ResizeObserver(refresh); observer.observe(hover.element);
    return () => { observer.disconnect(); window.removeEventListener("scroll", refresh, true); window.removeEventListener("resize", refresh); };
  }, [hover]);
  if (!hover) return null;
  return <div className="ux-gutter" data-ux-gutter style={point} onMouseLeave={onLeave} onMouseEnter={onEnter}>
    {hover.empty && <button title="Add block" aria-label="Add block" onPointerDown={e => e.preventDefault()} onClick={onInsert}>+</button>}
    <span role="button" tabIndex={0} aria-label="Drag or open block actions" title="Drag to reorder; click for actions"
      onPointerDown={onPointerDown} onClick={onMenu} onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onMenu(); }
      }}>⠿</span>
  </div>;
}
