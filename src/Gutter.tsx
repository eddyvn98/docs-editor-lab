import { useLayoutEffect, useState } from 'react';
import type { PointerEvent } from 'react';
import { GripVertical, Plus } from 'lucide-react';
import type { Hover } from './targets';

function firstContentCenter(element: HTMLElement) {
  const title = element.querySelector<HTMLElement>('.toggle-summary input');
  if (title) {
    const rect = title.getBoundingClientRect();
    if (rect.height) return rect.top + rect.height / 2;
  }
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const range = element.ownerDocument.createRange();
  let text: Node | null;
  while ((text = walker.nextNode())) {
    if (!text.textContent?.trim() || text.parentElement?.closest('[data-node-controls],button,[aria-hidden="true"]')) continue;
    range.selectNodeContents(text);
    const rect = range.getClientRects()[0];
    if (rect?.height) return rect.top + rect.height / 2;
  }
  const rect = element.getBoundingClientRect();
  return rect.top + rect.height / 2;
}

export function Gutter({ hover, onMenu, onInsert, onPointerDown, onLeave, onEnter }: {
  hover: Hover | null; onMenu: () => void; onInsert: () => void; onPointerDown: (event: PointerEvent<HTMLElement>) => void; onLeave?: () => void; onEnter?: () => void;
}) {
  const [point, setPoint] = useState({ left: -100, top: -100 });
  useLayoutEffect(() => {
    if (!hover) return;
    const refresh = () => {
      const rect = hover.element.getBoundingClientRect();
      setPoint({ left: Math.max(4, rect.left - 52), top: firstContentCenter(hover.element) - 16 });
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
