import { useEffect, useRef, useState } from 'react';
import { Check, Settings2, X } from 'lucide-react';
import type { ViewPreferences } from '../viewPreferences';
import { getLocale, setLocale, t } from './locale';
export function PageSettings({ view, onChange, onHelp }: { view: ViewPreferences; onChange: (patch: Partial<ViewPreferences>) => void; onHelp: () => void }) {
  const [open, setOpen] = useState(false), ref = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', key);
    ref.current?.querySelector<HTMLElement>('[role="dialog"] button')?.focus();
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key); };
  }, [open]);
  return <div ref={ref} className="docs-settings-anchor" data-node-controls>
    <button ref={trigger} className="docs-icon-button" aria-label="Document view options" title={t('Page settings')} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}><Settings2 size={18}/></button>
    {open && <div className="docs-settings-popover" role="dialog" aria-label="Page settings">
      <header><strong>{t('Page settings')}</strong><button aria-label="Close page settings" onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={16}/></button></header>
      <fieldset><legend>{t('Font')}</legend><div className="docs-segmented">{(['sans', 'serif', 'mono'] as const).map(font => <button key={font} aria-pressed={view.font === font} style={{ fontFamily: font === 'sans' ? 'sans-serif' : font === 'serif' ? 'serif' : 'monospace' }} onClick={() => onChange({ font })}>Aa<small>{font}</small></button>)}</div></fieldset>
      <label className="docs-setting-row">{t('Font size')}<select aria-label="Reading font size" value={view.size} onChange={event => onChange({ size: Number(event.target.value) })}>{[14, 15, 16, 17, 18, 20, 22].map(size => <option key={size} value={size}>{size}</option>)}</select></label>
      <button className="docs-setting-row" role="switch" aria-checked={view.width === 'wide'} onClick={() => onChange({ width: view.width === 'wide' ? 'page' : 'wide' })}>{t('Full width')}<span className="docs-switch">{view.width === 'wide' && <Check size={12}/>}</span></button>
      <button className="docs-setting-row" role="switch" aria-checked={view.focus} onClick={() => { onChange({ focus: !view.focus }); setOpen(false); }}>{t('Focus mode')}<span className="docs-switch">{view.focus && <Check size={12}/>}</span></button>
      <label className="docs-setting-row">{t('Appearance')}<select aria-label="Theme" value={view.theme} onChange={event => onChange({ theme: event.target.value as ViewPreferences['theme'] })}><option value="light">{t('Light')}</option><option value="dark">{t('Dark')}</option></select></label>
      <label className="docs-setting-row">{t('Language')}<select aria-label="Interface language" value={getLocale()} onChange={event => setLocale(event.target.value === 'vi' ? 'vi' : 'en')}><option value="en">English</option><option value="vi">{'Ti\u1ebfng Vi\u1ec7t'}</option></select></label>
      <button className="docs-setting-row docs-shortcut-link" onClick={() => { setOpen(false); onHelp(); }}>{t('Keyboard shortcuts')}<kbd>?</kbd></button>
    </div>}
  </div>;
}
