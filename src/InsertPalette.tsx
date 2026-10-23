import { useEffect, useId, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { Transaction } from '@tiptap/pm/state';
import { insertItems } from './logic';
import { blockDescriptions } from './blockCatalog';
import { insertNewBlock } from './insertNewBlock';
import { ModalSurface } from './ModalSurface';
export function InsertPalette({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [query, setQuery] = useState(''), [index, setIndex] = useState(0), [error, setError] = useState('');
  const [rows, setRows] = useState(3), [columns, setColumns] = useState(3);
  const bookmark = useRef(editor.state.selection.getBookmark()), listId = useId();
  const items = insertItems.filter(item => `${item.label} ${blockDescriptions[item.id] || ''}`.toLowerCase().includes(query.toLowerCase()));
  const selected = items[Math.min(index, Math.max(0, items.length - 1))];
  useEffect(() => {
    const map = ({ transaction }: { transaction: Transaction }) => { bookmark.current = bookmark.current.map(transaction.mapping); };
    editor.on('transaction', map); return () => { editor.off('transaction', map); };
  }, [editor]);
  useEffect(() => { document.getElementById(`${listId}-${selected?.id}`)?.scrollIntoView({ block: 'nearest' }); }, [selected?.id, listId]);
  const choose = (id: string) => {
    try { editor.view.dispatch(editor.state.tr.setSelection(bookmark.current.resolve(editor.state.doc))); }
    catch { setError('The original insertion point was removed. Close and choose a new position.'); return; }
    if (insertNewBlock(editor, id, rows, columns)) { onClose(); requestAnimationFrame(() => editor.view.focus()); }
    else setError('This block could not be inserted here. Your content was not replaced.');
  };
  return <ModalSurface title="Insert a block" onClose={onClose} className="insert-palette">
    <input autoFocus role="combobox" aria-label="Search blocks" aria-autocomplete="list" aria-controls={listId} aria-expanded="true"
      aria-activedescendant={selected ? `${listId}-${selected.id}` : undefined} placeholder="Search headings, lists, tables, images..." value={query}
      onChange={e => { setQuery(e.target.value); setIndex(0); }} onKeyDown={e => {
        if (e.isDefaultPrevented() || e.nativeEvent.isComposing) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => (i + (e.key === 'ArrowDown' ? 1 : -1) + Math.max(1, items.length)) % Math.max(1, items.length)); }
        else if (e.key === 'Enter' && selected) { e.preventDefault(); choose(selected.id); }
        else if (e.key === 'Home' && e.ctrlKey) { e.preventDefault(); setIndex(0); }
        else if (e.key === 'End' && e.ctrlKey) { e.preventDefault(); setIndex(items.length - 1); }
      }}/>
    <div className="insert-options" id={listId} role="listbox" aria-label="Block types">
      {items.map((item, i) => <button type="button" role="option" aria-selected={selected?.id === item.id} id={`${listId}-${item.id}`} key={item.id}
        onMouseEnter={() => setIndex(i)} onClick={() => choose(item.id)}><strong>{item.label}</strong><small>{blockDescriptions[item.id]}</small></button>)}
      {!items.length && <p>No blocks match this search.</p>}
    </div>
    <fieldset className="table-size"><legend>Table size</legend>
      <label>Rows<input aria-label="New table rows" type="number" min={1} max={20} value={rows} onChange={e => setRows(Number(e.target.value))}/></label>
      <label>Columns<input aria-label="New table columns" type="number" min={1} max={20} value={columns} onChange={e => setColumns(Number(e.target.value))}/></label>
    </fieldset>
    <p className="dialog-hint">Nonempty blocks are preserved. The new block is inserted below the current block.</p>
    {error && <p role="alert">{error}</p>}
  </ModalSurface>;
}
