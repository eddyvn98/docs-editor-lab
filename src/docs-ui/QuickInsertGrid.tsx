import type { Item } from '../logic';
import { BlockIcon } from './BlockIcon';
import { t } from './locale';

export const quickInsertIds = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8',
  'numbered', 'bullet', 'task', 'code', 'quote', 'callout', 'toggle', 'divider', 'equation', 'paragraph',
];
export const commonShortcutIds = new Set(['task', 'callout', 'equation']);

type Props = {
  items: Item[];
  menuId: string;
  activeIndex: number;
  role: 'menuitem' | 'option';
  indexOf: (id: string) => number;
  onChoose: (item: Item) => void;
  onHover: (index: number) => void;
};

export function QuickInsertGrid({ items, menuId, activeIndex, role, indexOf, onChoose, onHover }: Props) {
  const quickIds = new Set(quickInsertIds);
  const quick = items.filter(item => quickIds.has(item.id)).sort((a, b) => quickInsertIds.indexOf(a.id) - quickInsertIds.indexOf(b.id));
  return <div className="docs-quick-insert" role="group" aria-label={t('Basic blocks')}>
    {quick.map(item => {
      const index = indexOf(item.id), selected = index === activeIndex;
      return <button key={item.id} id={`${menuId}-${index}`} data-index={index} data-block={item.id} type="button" role={role}
        aria-label={t(item.label)} aria-selected={role === 'option' ? selected : undefined} title={t(item.label)}
        tabIndex={role === 'menuitem' && selected ? 0 : -1} className={selected ? 'is-highlighted' : ''}
        onPointerDown={event => event.preventDefault()} onFocus={() => onHover(index)} onMouseEnter={() => onHover(index)} onClick={() => onChoose(item)}>
        {/^h[1-8]$/.test(item.id) ? <span className="docs-quick-heading">{item.id.toUpperCase()}</span> : <BlockIcon id={item.id} size={17}/>}
      </button>;
    })}
  </div>;
}
