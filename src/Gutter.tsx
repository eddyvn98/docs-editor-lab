import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { GripVertical, Plus } from 'lucide-react';
import type { Hover } from './targets';
export function Gutter({ hover, onMenu, onInsert, onPointerDown, onLeave, onEnter }: {
  hover: Hover | null; onMenu: () => void; onInsert: () => void; onPointerDown: (event: PointerEvent<HTMLElement>) => void; onLeave?: () => void; onEnter?: () => void;
}) {
  const [point, setPoint] = useState({ left: -100, top: -100 }), timer = useRef(0);
  const cancel = () => window.clearTimeout(timer.current);
  useEffect(() => () => cancel(), []);
  useLayoutEffect(() => {
    cancel(); if (!hover) return;
    const refresh = () => { const rect = hover.element.getBoundingClientRect(); setPoint({ left: Math.max(4, rect.left - 52), top: rect.top + Math.min(6, Math.max(0, rect.height - 28)) }); };
    refresh(); window.addEventListener('scroll', refresh, true); window.addEventListener('resize', refresh);
    const observer = new ResizeObserver(refresh); observer.observe(hover.element);
    return () => { cancel(); observer.disconnect(); window.removeEventListener('scroll', refresh, true); window.removeEventListener('resize', refresh); };
  }, [hover]);
  if (!hover) return null;
  return <div className="ux-gutter" data-ux-gutter style={point} onMouseLeave={() => { cancel(); onLeave?.(); }} onMouseEnter={onEnter}>
    {hover.empty && <button title="Add block" aria-label="Add block" onMouseEnter={() => { cancel(); timer.current = window.setTimeout(onInsert, 240); }} onMouseLeave={cancel} onPointerDown={event => { cancel(); event.preventDefault(); }} onClick={onInsert}><Plus size={17}/></button>}
    <span role="button" tabIndex={0} aria-label="Drag or open block actions" title="Drag to reorder; Shift-click to select blocks" onMouseEnter={() => { cancel(); timer.current = window.setTimeout(onMenu, 320); }} onMouseLeave={cancel}
      onPointerDown={event => { cancel(); onPointerDown(event); }} onClick={onMenu} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onMenu(); } }}><GripVertical size={17}/></span>
  </div>;
}
