import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ArrowDown, ArrowUp, Clipboard, Columns2, Copy, Images, Trash2, X } from 'lucide-react';
import { Selection } from '@tiptap/pm/state';
import { useEditorPulse } from '../useEditorPulse';
import { Anchored } from '../Anchored';
import { batchAction, selectedBlocks } from './blockBatchActions';
import { BlockRangeSelection } from './blockSelection';
import { copySelection } from './copySelection';
import { t } from './locale';
export function BlockBatchBar({ editor }: { editor: Editor }) {
  useEditorPulse(editor);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null), [message, setMessage] = useState(''), root = useRef<HTMLDivElement>(null);
  const from = editor.state.selection.from, to = editor.state.selection.to;
  useEffect(() => { setPoint(null); setMessage(''); }, [from, to]);
  useEffect(() => {
    const open = (event: Event) => { if (editor.state.selection instanceof BlockRangeSelection) setPoint((event as CustomEvent).detail); };
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setPoint(null); };
    editor.view.dom.addEventListener('docs-batch-context', open); document.addEventListener('pointerdown', outside);
    return () => { editor.view.dom.removeEventListener('docs-batch-context', open); document.removeEventListener('pointerdown', outside); };
  }, [editor]);
  useEffect(() => { if (point) root.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true }); }, [point]);
  if (!editor.isEditable || !(editor.state.selection instanceof BlockRangeSelection)) return null;
  const blocks = selectedBlocks(editor), controls = [
    { action: 'duplicate', label: 'Duplicate selected blocks', icon: Copy }, { action: 'up', label: 'Move selected blocks up', icon: ArrowUp }, { action: 'down', label: 'Move selected blocks down', icon: ArrowDown },
    { action: 'columns', label: 'Arrange in columns', icon: Columns2 }, ...(blocks.every(node => node.type.name === 'image') && blocks.length <= 12 ? [{ action: 'gallery', label: 'Arrange images', icon: Images }] : []),
    { action: 'delete', label: 'Delete selected blocks', icon: Trash2 },
  ] as const;
  const buttons = <><button aria-label="Copy selected blocks" title={t('Copy selected blocks')} onClick={() => { void copySelection(editor, from, to).then(() => setMessage(t('Copied'))).catch(error => setMessage(String(error.message))); }}><Clipboard size={17}/>{point && <span>{t('Copy selected blocks')}</span>}</button>
    {controls.map(({ action, label, icon: Icon }) => <button key={action} aria-label={label} title={t(label)} disabled={action === 'up' && from === 0 || action === 'down' && to === editor.state.doc.content.size}
      onClick={() => { if (batchAction(editor, action as Parameters<typeof batchAction>[1])) setPoint(null); }}><Icon size={17}/>{point && <span>{t(label)}</span>}</button>)}</>;
  const contents = <div ref={root} className={point ? 'docs-batch-context' : 'docs-batch-bar'} role="toolbar" aria-label="Selected block actions" data-ux-overlay onPointerDown={event => event.preventDefault()} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setPoint(null); editor.view.focus(); }
    if (['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')), current = buttons.indexOf(document.activeElement as HTMLButtonElement); buttons[(current + (['ArrowUp','ArrowLeft'].includes(event.key) ? -1 : 1) + buttons.length) % buttons.length]?.focus(); }
  }}><strong>{blocks.length} {t('selected')}</strong>{buttons}<button aria-label="Clear block selection" onClick={() => editor.view.dispatch(editor.state.tr.setSelection(Selection.near(editor.state.selection.$from)))}><X size={17}/></button>{message && <p role="status">{message}</p>}</div>;
  return point ? <Anchored editor={editor} anchor={{ element: null, point, mode: 'pointer' }} className="docs-batch-menu">{contents}</Anchored> : contents;
}
