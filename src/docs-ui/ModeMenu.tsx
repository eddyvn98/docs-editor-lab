import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Check, ChevronDown, Eye, MessageSquareDiff, Pencil } from 'lucide-react';
import { isSuggesting, setSuggesting } from '../docs-content/Suggestions';
import { useEditorPulse } from '../useEditorPulse';
import { t } from './locale';
export function ModeMenu({ editor, readOnly, onReadOnly, onReview }: { editor: Editor; readOnly: boolean; onReadOnly: (value: boolean) => void; onReview: () => void }) {
  useEditorPulse(editor);
  const [open, setOpen] = useState(false), root = useRef<HTMLDivElement>(null);
  const mode = readOnly ? 'Reading' : isSuggesting(editor) ? 'Suggesting' : 'Editing', Icon = readOnly ? Eye : mode === 'Suggesting' ? MessageSquareDiff : Pencil;
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLButtonElement>('[role=menuitemradio][aria-checked=true]')?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside); return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  return <div className="docs-mode-menu" ref={root} data-ux-overlay>
    <button className="docs-mode-button" aria-label="Document editing mode" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}><Icon size={16}/><span>{t(mode)}</span><ChevronDown size={13}/></button>
    {open && <div className="docs-mode-options" role="menu" onKeyDown={event => {
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button')), index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) { event.preventDefault(); buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus(); }
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); root.current?.querySelector('button')?.focus(); }
    }}>{(['Editing','Suggesting','Reading'] as const).map(value => {
      const ItemIcon = value === 'Reading' ? Eye : value === 'Suggesting' ? MessageSquareDiff : Pencil;
      return <button role="menuitemradio" aria-checked={mode === value} key={value} onClick={() => { onReadOnly(value === 'Reading'); setSuggesting(editor, value === 'Suggesting'); if (value === 'Suggesting') onReview(); setOpen(false); }}><ItemIcon size={17}/><span>{t(value)}<small>{t(value === 'Editing' ? 'Change the document directly' : value === 'Suggesting' ? 'Propose changes for review' : 'Read without editing')}</small></span>{mode === value && <Check size={15}/>}</button>;
    })}</div>}
  </div>;
}
