import { useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { closeHistory } from '@tiptap/pm/history';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, X } from 'lucide-react';
import { searchKey } from '../SearchHighlights';
import { goToHeading } from '../HeadingFolding';
import { useEditorPulse } from '../useEditorPulse';
import { documentMatches } from './searchModel';
import { t } from './locale';
export function FindBar({ editor }: { editor: Editor }) {
  const pulse = useEditorPulse(editor), [open, setOpen] = useState(false), [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState(''), [replacement, setReplacement] = useState(''), [current, setCurrent] = useState(0);
  const [caseSensitive, setCaseSensitive] = useState(false), [wholeWord, setWholeWord] = useState(false), [message, setMessage] = useState('');
  const input = useRef<HTMLInputElement>(null), ref = useRef<HTMLDivElement>(null);
  const matches = useMemo(() => documentMatches(editor.state.doc, query, { caseSensitive, wholeWord }), [editor, pulse, query, caseSensitive, wholeWord]);
  const index = matches.length ? Math.min(current, matches.length - 1) : 0;
  useEffect(() => { setCurrent(0); setMessage(''); }, [query, caseSensitive, wholeWord]);
  useEffect(() => {
    if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(searchKey, { query: open ? query : '', current: index, caseSensitive, wholeWord }).setMeta('addToHistory', false));
  }, [editor, open, query, index, caseSensitive, wholeWord]);
  useEffect(() => {
    const show = () => { setOpen(true); requestAnimationFrame(() => { input.current?.focus(); input.current?.select(); }); };
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if ((event.ctrlKey || event.metaKey) && ['f', 'h'].includes(event.key.toLowerCase()) && (editor.isFocused || ref.current?.contains(event.target as Node))) {
        event.preventDefault(); if (event.key.toLowerCase() === 'h') setExpanded(true); show();
      }
      if (open && event.key === 'Escape' && ref.current?.contains(event.target as Node)) { event.preventDefault(); setOpen(false); editor.view.focus(); }
    };
    window.addEventListener('docs-open-search', show); document.addEventListener('keydown', key);
    return () => { window.removeEventListener('docs-open-search', show); document.removeEventListener('keydown', key); };
  }, [editor, open]);
  const go = (offset: number) => {
    if (!matches.length) return;
    const next = (index + offset + matches.length) % matches.length, range = matches[next]; setCurrent(next);
    goToHeading(editor, range.from); editor.commands.setTextSelection(range); input.current?.focus({ preventScroll: true });
  };
  const replace = (all: boolean) => {
    if (!editor.isEditable || !matches.length) return;
    const ranges = all ? [...matches].reverse() : [matches[index]], tr = closeHistory(editor.state.tr);
    for (const range of ranges) tr.insertText(replacement, range.from, range.to);
    if (tr.docChanged) editor.view.dispatch(tr);
    setMessage(`${ranges.length} ${t('replaced')}`); input.current?.focus();
  };
  if (!open) return null;
  return <div ref={ref} className="docs-findbar" role="search" aria-label="Find in document" data-ux-overlay>
    <div className="docs-find-row"><button aria-label="Toggle replace" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}</button>
      <input ref={input} aria-label="Find text" placeholder={t('Find in document')} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); go(event.shiftKey ? -1 : 1); } }}/>
      <span className="docs-find-count" role="status">{query ? `${matches.length ? index + 1 : 0}/${matches.length}` : ''}</span>
      <button aria-label="Previous match" disabled={!matches.length} onClick={() => go(-1)}><ArrowUp size={16}/></button><button aria-label="Next match" disabled={!matches.length} onClick={() => go(1)}><ArrowDown size={16}/></button>
      <button aria-label="Close search" onClick={() => { setOpen(false); editor.view.focus(); }}><X size={16}/></button></div>
    <div className="docs-find-options"><label><input type="checkbox" checked={caseSensitive} onChange={event => setCaseSensitive(event.target.checked)}/>{t('Match case')}</label><label><input type="checkbox" checked={wholeWord} onChange={event => setWholeWord(event.target.checked)}/>{t('Whole word')}</label></div>
    {expanded && editor.isEditable && <div className="docs-find-row"><input aria-label="Replace with" placeholder={t('Replace with')} value={replacement} onChange={event => setReplacement(event.target.value)}/><button disabled={!matches.length} onClick={() => replace(false)}>{t('Replace')}</button><button disabled={!matches.length} onClick={() => replace(true)}>{t('Replace all')}</button></div>}
    {message && <p role="status">{message}</p>}
  </div>;
}
