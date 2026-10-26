import { useLayoutEffect, useState } from 'react';
import type { PointerEvent } from 'react';
import { GripVertical, Plus } from 'lucide-react';
import type { Hover } from './targets';

export function Gutter({ hover, onMenu, onInsert, onPointerDown, onLeave, onEnter }: {
  hover: Hover | null; onMenu: () => void; onInsert: () => void; onPointerDown: (event: PointerEvent<HTMLElement>) => void; onLeave?: () => void; onEnter?: () => void;
}) {
  const [point, setPoint] = useState({ left: -100, top: -100 });
  useLayoutEffect(() => {
    if (!hover) return;
    const refresh = () => {
      const rect = hover.element.getBoundingClientRect();
      const isTextBlock = hover.element.matches('p,h1,h2,h3,h4,h5,h6,li,blockquote');
      setPoint({ left: Math.max(4, rect.left - 52), top: rect.top + (isTextBlock ? -3 : Math.min(6, Math.max(0, rect.height - 28))) });
    };
    refresh(); window.addEventListener('scroll', refresh, true); window.addEventListener('resize', refresh);
    const observer = new ResizeObserver(refresh); observer.observe(hover.element);
    return () => { observer.disconnect(); window.removeEventListener('scroll', refresh, true); window.removeEventListener('resize', refresh); };
  }, [hover]);
  if (!hover) return null;
  return <div className="ux-gutter" data-ux-gutter style={point} onMouseLeave={onLeave} onMouseEnter={onEnter}>
    {hover.empty && <button title="Add block" aria-label="Add block" onPointerDown={event => event.preventDefault()} onClick={onInsert}><Plus size={17}/></button>}
    <span role="button" tabIndex={0} aria-label="Drag or open block actions" title="Drag to reorder; Shift-click to select blocks"
      onPointerDown={onPointerDown} onClick={onMenu} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onMenu(); } }}><GripVertical size={17}/></span>
  </div>;
}
