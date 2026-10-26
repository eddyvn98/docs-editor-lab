import { useEffect, useId, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ArrowLeft, ChevronRight, Search } from 'lucide-react';
import { Anchored } from './Anchored';
import { actionsFor, conversionIds, filterDocsInserts } from './logic';
import type { Action, Item } from './logic';
import type { Popup } from './targets';
import { BlockIcon } from './docs-ui/BlockIcon';
import { commonShortcutIds, QuickInsertGrid, quickInsertIds } from './docs-ui/QuickInsertGrid';
import { TableSizePicker } from './docs-ui/TableSizePicker';
import { t, useDocsLocale } from './docs-ui/locale';
type Entry = Item | { id: '__convert'; label: string; destructive?: boolean; shortcut?: string };
export function PopupMenu({ editor, popup, onChoose, onClose }: {
  editor: Editor; popup: Popup; onChoose: (action: Action, size?: { rows: number; columns: number }) => void; onClose: () => void;
}) {
  useDocsLocale();
  const [search, setSearch] = useState(''), [index, setIndex] = useState(0), [convert, setConvert] = useState(false), [table, setTable] = useState(false);
  const ref = useRef<HTMLDivElement>(null), id = useId(), slash = popup.type === 'slash', context = popup.type === 'menu';
  const query = slash ? popup.query || '' : search, actions = context ? actionsFor(popup.block) : filterDocsInserts(query);
  const conversions = actions.filter(item => conversionIds.has(item.id));
  const items: Entry[] = context && conversions.length > 1 ? convert ? conversions : [{ id: '__convert', label: 'Turn into' }, ...actions.filter(item => !conversionIds.has(item.id))] : actions;
  const quick = !context && !query.trim(), indexOf = (id: string) => items.findIndex(item => item.id === id);
  const quickItems = quick ? items.filter((item): item is Item => item.id !== '__convert' && quickInsertIds.includes(item.id)) : [];
  const listItems = quick ? items.filter(item => !quickInsertIds.includes(item.id) || commonShortcutIds.has(item.id)) : items;
  const active = items[Math.min(index, Math.max(0, items.length - 1))];
  const activeId = active ? `${id}-${quick && quickInsertIds.includes(active.id) ? 'quick' : 'item'}-${index}` : undefined;
  const enabled = (action: Entry['id']) => action === 'merge-cells' ? editor.can().mergeCells() : action === 'split-cell' ? editor.can().splitCell() : true;
  const choose = (item: Entry) => {
    if (!enabled(item.id)) return;
    if (item.id === '__convert') { setConvert(true); setIndex(0); return; }
    if (item.id === 'table' && !context) { setTable(true); return; }
    onChoose(item.id);
  };
  useEffect(() => { setIndex(quick ? Math.max(0, items.findIndex(item => item.id === 'h1')) : 0); setTable(false); }, [query]);
  useEffect(() => { if (!slash) (ref.current?.querySelector('input,button:not(:disabled)') as HTMLElement | null)?.focus({ preventScroll: true }); }, [slash, convert, table]);
  useEffect(() => { ref.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' }); }, [index]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as Node | null;
      if (!target || (!ref.current?.contains(target) && !editor.view.dom.contains(target))) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (table) setTable(false); else if (convert) setConvert(false); else onClose(); return; }
      if (event.key === 'Tab') { if (slash) onClose(); return; }
      if (table) return;
      if (context && event.key === 'ArrowLeft' && convert) { event.preventDefault(); setConvert(false); setIndex(0); return; }
      if (context && event.key === 'ArrowRight' && active?.id === '__convert') { event.preventDefault(); setConvert(true); setIndex(0); return; }
      const input = target instanceof HTMLInputElement;
      if (!(input ? ['ArrowDown','ArrowUp','Enter'] : ['ArrowDown','ArrowUp','Home','End','Enter']).includes(event.key)) return;
      event.preventDefault(); event.stopPropagation(); if (!items.length) return;
      if (event.key === 'Enter') { if (active) choose(active); return; }
      const direction = event.key === 'ArrowUp' || event.key === 'End' ? -1 : 1;
      let next = event.key === 'Home' ? -1 : event.key === 'End' ? 0 : index;
      for (let attempt = 0; attempt < items.length; attempt++) { next = (next + direction + items.length) % items.length; if (enabled(items[next].id)) break; }
      setIndex(next); if (!slash && !input) ref.current?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)?.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', key, true); return () => document.removeEventListener('keydown', key, true);
  });
  return <Anchored editor={editor} anchor={popup.anchor} className={`menu-wrap docs-block-menu ${context ? 'is-context' : 'is-insert'}`}>
    <div ref={ref} className="ux-menu" role="menu" aria-label={context ? 'Block actions' : 'Insert block'} aria-activedescendant={active && !table ? activeId : undefined}>
      {table ? <TableSizePicker onBack={() => setTable(false)} onChoose={(rows, columns) => onChoose('table', { rows, columns })}/> : <>
        {convert && <button className="docs-menu-back" onClick={() => { setConvert(false); setIndex(0); }}><ArrowLeft size={14}/>{t('Turn into')}</button>}
        {popup.type === 'insert' && <div className="docs-menu-search"><Search size={15}/><input aria-label="Search block types" placeholder={t('Search blocks...')} value={search} onChange={event => setSearch(event.target.value)}/></div>}
        {slash && <div className="menu-search"><Search size={14}/>{query || t('Search blocks...')}</div>}
        <div className="docs-menu-scroll">
          {quick && <><div className="docs-menu-group">{t('Basic blocks')}</div><QuickInsertGrid items={quickItems} menuId={`${id}-quick`} activeIndex={index} role="menuitem" indexOf={indexOf} onChoose={choose} onHover={setIndex}/></>}
          {listItems.length > 0 && <><div className="docs-menu-group">{t(quick ? 'Common blocks' : context ? 'Actions' : 'Search results')}</div>{listItems.map(item => { const i = indexOf(item.id); return <div key={item.id}>
            <button id={`${id}-item-${i}`} data-index={i} type="button" role="menuitem" tabIndex={i === index ? 0 : -1} disabled={!enabled(item.id)}
              className={`${i === index ? 'is-highlighted ' : ''}${item.destructive ? 'destructive' : ''}`}
              onPointerDown={event => event.preventDefault()} onMouseEnter={() => setIndex(i)} onClick={() => choose(item)}>
              <BlockIcon id={item.id}/><span className="docs-menu-label">{t(item.label)}</span>
              {item.id === '__convert' ? <ChevronRight size={14}/> : item.shortcut && <kbd>{item.shortcut}</kbd>}
            </button>
          </div>; })}</>}
          {!items.length && <p role="status">{t('No matching blocks')}</p>}
        </div><div className="menu-footer">{'\u2191\u2193'} {t('Navigate')} <span>{'\u21b5'} {t('Insert')}</span> <span>Esc {t('Close')}</span></div>
      </>}
    </div>
  </Anchored>;
}
