import { useRef, useState } from 'react';
import { tableDimensions } from '../blockCatalog';
import { t } from './locale';
export function TableSizePicker({ onChoose, onBack }: { onChoose: (rows: number, columns: number) => void; onBack?: () => void }) {
  const [rows, setRows] = useState(3), [columns, setColumns] = useState(3), [cell, setCell] = useState(18), grid = useRef<HTMLDivElement>(null);
  const choose = () => { const size = tableDimensions(rows, columns); onChoose(size.rows, size.columns); };
  return <section className="docs-table-picker" aria-label="Table dimensions">
    <header>{onBack && <button onClick={onBack}>{'\u2190'} {t('Back')}</button>}<strong>{columns} {'\u00d7'} {rows}</strong></header>
    <div ref={grid} className="docs-table-grid" role="grid" aria-label="Choose table size" onKeyDown={event => {
      const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 };
      if (!(event.key in moves) && !['Home','End'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? 63 : Math.max(0, Math.min(63, cell + moves[event.key]));
      setCell(next); grid.current?.querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)?.focus();
    }}>{Array.from({ length: 8 }, (_, row) => <div role="row" key={row}>{Array.from({ length: 8 }, (_, column) => <button type="button" role="gridcell" key={column} data-cell={row * 8 + column} tabIndex={cell === row * 8 + column ? 0 : -1}
      aria-label={`${column + 1} columns, ${row + 1} rows`} aria-selected={row < rows && column < columns} onMouseEnter={() => { setRows(row + 1); setColumns(column + 1); }} onFocus={() => { setCell(row * 8 + column); setRows(row + 1); setColumns(column + 1); }} onClick={() => onChoose(row + 1, column + 1)}/>)}</div>)}</div>
    <div className="docs-table-dimensions"><label>{t('Rows')}<input aria-label="New table rows" type="number" min={1} max={20} value={rows} onChange={event => setRows(Number(event.target.value))}/></label><label>{t('Columns')}<input aria-label="New table columns" type="number" min={1} max={20} value={columns} onChange={event => setColumns(Number(event.target.value))}/></label></div>
    <button className="docs-primary" onClick={choose}>{t('Insert table')}</button>
  </section>;
}
