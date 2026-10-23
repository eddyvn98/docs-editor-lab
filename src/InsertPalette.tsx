import { useEffect, useId, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { Transaction } from '@tiptap/pm/state';
import { insertItems } from './logic';
import { blockDescriptions } from './blockCatalog';
import { insertNewBlock } from './insertNewBlock';
import { ModalSurface } from './ModalSurface';
import { requestDocs } from './docsEvents';
import { positionById } from './BlockIdentity';
export function InsertPalette({ editor, onClose, afterPos }: { editor: Editor; onClose: () => void; afterPos?: number }) {
  const [query, setQuery] = useState(''), [index, setIndex] = useState(0), [error, setError] = useState('');
  const [rows, setRows] = useState(3), [columns, setColumns] = useState(3);
  const bookmark = useRef(editor.state.selection.getBookmark()), listId = useId();
  const target = useRef(afterPos), targetId = useRef(afterPos === undefined || afterPos < 0 || afterPos >= editor.state.doc.content.size ? undefined : editor.state.doc.nodeAt(afterPos)?.attrs.blockId);
  const items = insertItems.filter(item => `${item.label} ${blockDescriptions[item.id] || ''}`.toLowerCase().includes(query.toLowerCase()));
  const selected = items[Math.min(index, Math.max(0, items.length - 1))];
  useEffect(() => {
    const map = ({ transaction }: { transaction: Transaction }) => {
      bookmark.current = bookmark.current.map(transaction.mapping);
      if (target.current !== undefined && target.current >= 0) {
        const result = transaction.mapping.mapResult(target.current, 1);
        target.current = targetId.current ? positionById(editor, String(targetId.current)) ?? -1 : result.deleted ? -1 : result.pos;
      }
    };
    editor.on('transaction', map); return () => { editor.off('transaction', map); };
  }, [editor]);
  useEffect(() => { document.getElementById(`${listId}-${selected?.id}`)?.scrollIntoView({ block: 'nearest' }); }, [selected?.id, listId]);
  const choose = (id: string) => {
    try { editor.view.dispatch(editor.state.tr.setSelection(bookmark.current.resolve(editor.state.doc))); }
    catch { setError('The original insertion point was removed. Close and choose a new position.'); return; }
    if (target.current === -1) { setError('The target block was deleted. Choose a new insertion point.'); return; }
    if (id === 'templates') { onClose(); requestDocs(editor, { action: 'templates', pos: target.current }); return; }
    if (insertNewBlock(editor, id, rows, columns, target.current)) { onClose(); requestAnimationFrame(() => editor.view.focus()); }
    else setError('This block could not be inserted here. Your content was not replaced.');
  };
  return <ModalSurface title="Insert a block" onClose={onClose} className="insert-palette">
    <input autoFocus role="combobox" aria-label="Search blocks" aria-autocomplete="list" aria-controls={listId} aria-expanded="true"
      aria-activedescendant={selected ? `${listId}-${selected.id}` : undefined} placeholder="Search headings, lists, tables, images..." value={query}
      onChange={event => { setQuery(event.target.value); setIndex(0); }} onKeyDown={event => {
        if (event.isDefaultPrevented() || event.nativeEvent.isComposing) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setIndex(i => (i + (event.key === 'ArrowDown' ? 1 : -1) + Math.max(1, items.length)) % Math.max(1, items.length)); }
        else if (event.key === 'Enter' && selected) { event.preventDefault(); choose(selected.id); }
        else if (event.key === 'Home' && event.ctrlKey) { event.preventDefault(); setIndex(0); }
        else if (event.key === 'End' && event.ctrlKey) { event.preventDefault(); setIndex(items.length - 1); }
      }}/>
    <div className="insert-options" id={listId} role="listbox" aria-label="Block types">
      {items.map((item, i) => <button type="button" role="option" aria-selected={selected?.id === item.id} id={`${listId}-${item.id}`} key={item.id}
        onMouseEnter={() => setIndex(i)} onClick={() => choose(item.id)}><strong>{item.label}</strong><small>{item.id === 'templates' ? 'Reuse blocks saved in this browser' : blockDescriptions[item.id]}</small></button>)}
      {!items.length && <p>No blocks match this search.</p>}
    </div>
    <fieldset className="table-size"><legend>Table size</legend>
      <label>Rows<input aria-label="New table rows" type="number" min={1} max={20} value={rows} onChange={event => setRows(Number(event.target.value))}/></label>
      <label>Columns<input aria-label="New table columns" type="number" min={1} max={20} value={columns} onChange={event => setColumns(Number(event.target.value))}/></label>
    </fieldset>
    <p className="dialog-hint">The new block is inserted below. Existing document content is preserved.</p>
    {error && <p role="alert">{error}</p>}
  </ModalSurface>;
}
