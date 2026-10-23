import { useEffect, useRef, useState } from 'react';
import type { ViewPreferences } from './viewPreferences';
export function ViewControls({ view, onChange, onHelp }: { view: ViewPreferences; onChange: (patch: Partial<ViewPreferences>) => void; onHelp: () => void }) {
  const [open, setOpen] = useState(false), ref = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className="view-controls" ref={ref}>
    <button ref={trigger} aria-label="Document view options" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(v => !v)}>View</button>
    {open && <section className="view-popover" role="dialog" aria-label="View options">
      <strong>Reading preferences</strong>
      <label>Mode<select value={view.mode} onChange={e => onChange({ mode: e.target.value as ViewPreferences['mode'] })}><option value="edit">Editing</option><option value="read">Reading</option></select></label>
      <label>Page width<select value={view.width} onChange={e => onChange({ width: e.target.value as ViewPreferences['width'] })}><option value="page">Page</option><option value="wide">Full width</option></select></label>
      <label>Reading font<select value={view.font} onChange={e => onChange({ font: e.target.value as ViewPreferences['font'] })}><option value="sans">Sans serif</option><option value="serif">Serif</option><option value="mono">Monospace</option></select></label>
      <label>Text size: {view.size}px<input type="range" min={14} max={22} value={view.size} onChange={e => onChange({ size: Number(e.target.value) })}/></label>
      <label><input type="checkbox" checked={view.focus} onChange={e => onChange({ focus: e.target.checked })}/> Focus mode</label>
      <label><input type="checkbox" checked={view.theme === 'dark'} onChange={e => onChange({ theme: e.target.checked ? 'dark' : 'light' })}/> Dark appearance</label>
      <button onClick={() => { setOpen(false); onHelp(); }}>Keyboard shortcuts</button>
      <small>View options stay in this browser and do not change document formatting or permissions.</small>
    </section>}
  </div>;
}
