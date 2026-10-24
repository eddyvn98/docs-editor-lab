import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { Transaction } from '@tiptap/pm/state';
import { Search, X } from 'lucide-react';
import { filterInserts } from './logic';
import { blockDescriptions, blockGroup } from './blockCatalog';
import { insertNewBlock } from './insertNewBlock';
import { Anchored } from './Anchored';
import { insertDocumentShortcut } from './documentShortcuts';
import { requestDocs } from './docsEvents';
import { positionById } from './BlockIdentity';
import { BlockIcon } from './docs-ui/BlockIcon';
import { TableSizePicker } from './docs-ui/TableSizePicker';
import { t, useDocsLocale } from './docs-ui/locale';
export function InsertPalette({ editor, onClose, afterPos }: { editor: Editor; onClose: () => void; afterPos?: number }) {
  useDocsLocale();
  const [query, setQuery] = useState(''), [index, setIndex] = useState(0), [error, setError] = useState(''), [table, setTable] = useState(false);
  const bookmark = useRef(editor.state.selection.getBookmark()), listId = useId(), root = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
  const target = useRef(afterPos), targetId = useRef(afterPos === undefined || afterPos < 0 || afterPos >= editor.state.doc.content.size ? undefined : editor.state.doc.nodeAt(afterPos)?.attrs.blockId);
  const items = filterInserts(query), selected = items[Math.min(index, Math.max(0, items.length - 1))];
  const anchor = useMemo(() => ({ element: null, point: { x: 0, y: 0 }, mode: 'caret' as const, from: editor.state.selection.from }), [editor]);
  useEffect(() => {
    const map = ({ transaction }: { transaction: Transaction }) => {
      bookmark.current = bookmark.current.map(transaction.mapping); anchor.from = transaction.mapping.map(anchor.from, 1);
      if (target.current !== undefined && target.current >= 0) { const result = transaction.mapping.mapResult(target.current, 1); target.current = targetId.current ? positionById(editor, String(targetId.current)) ?? -1 : result.deleted ? -1 : result.pos; }
    };
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) onClose(); };
    editor.on('transaction', map); document.addEventListener('pointerdown', outside);
    requestAnimationFrame(() => input.current?.focus());
    return () => { editor.off('transaction', map); document.removeEventListener('pointerdown', outside); };
  }, [editor, onClose]);
  useEffect(() => { document.getElementById(`${listId}-${selected?.id}`)?.scrollIntoView({ block: 'nearest' }); }, [selected?.id, listId]);
  const choose = (id: string, rows = 3, columns = 3) => {
    if (!editor.isEditable) return;
    try { editor.view.dispatch(editor.state.tr.setSelection(bookmark.current.resolve(editor.state.doc))); } catch { setError('The original insertion point was removed. Close and choose a new position.'); return; }
    if (target.current === -1) { setError('The target block was deleted. Choose a new insertion point.'); return; }
    if (id === 'templates-gallery') { onClose(); window.dispatchEvent(new Event('docs-open-template-gallery')); return; }
    if (id.startsWith('template-')) { if (insertDocumentShortcut(editor, id, target.current)) { onClose(); return; } setError('Template insertion failed.'); return; }
    if (id === 'templates') { onClose(); requestDocs(editor, { action: 'templates', pos: target.current }); return; }
    if (insertNewBlock(editor, id, rows, columns, target.current)) { onClose(); requestAnimationFrame(() => editor.view.focus()); }
    else setError('This block could not be inserted here. Your content was not replaced.');
  };
  const pick = (id: string) => id === 'table' ? setTable(true) : choose(id);
  return <Anchored editor={editor} anchor={anchor} className="docs-insert-popover"><div ref={root} role="dialog" aria-label="Insert a block" className="insert-palette docs-insert-surface" onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (table) { setTable(false); requestAnimationFrame(() => input.current?.focus()); } else { onClose(); editor.view.focus(); } }
  }}>
    <header><strong>{t('Insert')}</strong><button aria-label="Close insert menu" onClick={() => { onClose(); editor.view.focus(); }}><X size={16}/></button></header>
    {table ? <TableSizePicker onBack={() => setTable(false)} onChoose={(rows, columns) => choose('table', rows, columns)}/> : <>
      <div className="docs-menu-search"><Search size={16}/><input ref={input} role="combobox" aria-label="Search blocks" aria-autocomplete="list" aria-controls={listId} aria-expanded="true" aria-activedescendant={selected ? `${listId}-${selected.id}` : undefined} placeholder={t('Search blocks...')} value={query}
        onChange={event => { setQuery(event.target.value); setIndex(0); }} onKeyDown={event => {
          if (event.isDefaultPrevented() || event.nativeEvent.isComposing) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setIndex(i => (i + (event.key === 'ArrowDown' ? 1 : -1) + Math.max(1, items.length)) % Math.max(1, items.length)); }
          else if (event.key === 'Enter' && selected) { event.preventDefault(); pick(selected.id); }
        }}/></div>
      <div className="insert-options docs-insert-options" id={listId} role="listbox" aria-label="Block types">{items.map((item, i) => <div key={item.id} role="presentation">
        {(!i || blockGroup(item.id) !== blockGroup(items[i - 1].id)) && <div className="docs-menu-group" role="presentation">{t(blockGroup(item.id))}</div>}
        <button type="button" role="option" aria-selected={selected?.id === item.id} id={`${listId}-${item.id}`} onMouseEnter={() => setIndex(i)} onClick={() => pick(item.id)}><BlockIcon id={item.id}/><span><strong>{t(item.label)}</strong><small>{t(blockDescriptions[item.id] || '')}</small></span></button>
      </div>)}{!items.length && <p>{t('No matching blocks')}</p>}</div>
    </>}
    {error && <p className="docs-error" role="alert">{error}</p>}
  </div></Anchored>;
}
