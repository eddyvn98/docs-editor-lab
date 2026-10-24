import { useEffect, useId, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ArrowLeft, ChevronRight, Search } from 'lucide-react';
import { Anchored } from './Anchored';
import { actionsFor, conversionIds, filterInserts } from './logic';
import type { Action, Item } from './logic';
import type { Popup } from './targets';
import { blockDescriptions, blockGroup } from './blockCatalog';
import { BlockIcon } from './docs-ui/BlockIcon';
import { TableSizePicker } from './docs-ui/TableSizePicker';
import { t, useDocsLocale } from './docs-ui/locale';
type Entry = Item | { id: '__convert'; label: string; destructive?: boolean; shortcut?: string };
export function PopupMenu({ editor, popup, onChoose, onClose }: {
  editor: Editor; popup: Popup; onChoose: (action: Action, size?: { rows: number; columns: number }) => void; onClose: () => void;
}) {
  useDocsLocale();
  const [search, setSearch] = useState(''), [index, setIndex] = useState(0), [convert, setConvert] = useState(false), [table, setTable] = useState(false);
  const ref = useRef<HTMLDivElement>(null), id = useId(), slash = popup.type === 'slash', context = popup.type === 'menu';
  const query = slash ? popup.query || '' : search, actions = context ? actionsFor(popup.block) : filterInserts(query);
  const conversions = actions.filter(item => conversionIds.has(item.id));
  const items: Entry[] = context && conversions.length > 1 ? convert ? conversions : [{ id: '__convert', label: 'Turn into' }, ...actions.filter(item => !conversionIds.has(item.id))] : actions;
  const active = items[Math.min(index, Math.max(0, items.length - 1))];
  const enabled = (action: Entry['id']) => action === 'merge-cells' ? editor.can().mergeCells() : action === 'split-cell' ? editor.can().splitCell() : true;
  const choose = (item: Entry) => {
    if (!enabled(item.id)) return;
    if (item.id === '__convert') { setConvert(true); setIndex(0); return; }
    if (item.id === 'table' && !context) { setTable(true); return; }
    onChoose(item.id);
  };
  useEffect(() => { setIndex(0); setTable(false); }, [query]);
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
    <div ref={ref} className="ux-menu" role="menu" aria-label={context ? 'Block actions' : 'Insert block'} aria-activedescendant={active && !table ? `${id}-${index}` : undefined}>
      {table ? <TableSizePicker onBack={() => setTable(false)} onChoose={(rows, columns) => onChoose('table', { rows, columns })}/> : <>
        {convert && <button className="docs-menu-back" onClick={() => { setConvert(false); setIndex(0); }}><ArrowLeft size={14}/>{t('Turn into')}</button>}
        {popup.type === 'insert' && <div className="docs-menu-search"><Search size={15}/><input aria-label="Search block types" placeholder={t('Search blocks...')} value={search} onChange={event => setSearch(event.target.value)}/></div>}
        {slash && <div className="menu-search"><Search size={14}/>{query || t('Search blocks...')}</div>}
        <div className="docs-menu-scroll">{!items.length && <p role="status">{t('No matching blocks')}</p>}
          {items.map((item, i) => <div key={item.id}>
            {!context && (!i || blockGroup(item.id) !== blockGroup(items[i - 1].id)) && <div className="docs-menu-group">{t(blockGroup(item.id))}</div>}
            <button id={`${id}-${i}`} data-index={i} type="button" role="menuitem" tabIndex={i === index ? 0 : -1} disabled={!enabled(item.id)}
              className={`${i === index ? 'is-highlighted ' : ''}${item.destructive ? 'destructive' : ''}`}
              onPointerDown={event => event.preventDefault()} onMouseEnter={() => setIndex(i)} onClick={() => choose(item)}>
              <BlockIcon id={item.id}/><span className="docs-menu-label">{t(item.label)}{!context && blockDescriptions[item.id] && <small>{t(blockDescriptions[item.id])}</small>}</span>
              {item.id === '__convert' ? <ChevronRight size={14}/> : item.shortcut && <kbd>{item.shortcut}</kbd>}
            </button>
          </div>)}
        </div><div className="menu-footer">{'\u2191\u2193'} {t('Navigate')} <span>{'\u21b5'} {t('Insert')}</span> <span>Esc {t('Close')}</span></div>
      </>}
    </div>
  </Anchored>;
}
