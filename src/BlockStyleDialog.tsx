import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { Transaction } from '@tiptap/pm/state';
import { ModalSurface } from './ModalSurface';
import { blockColors, hexColor, blockIndent } from './blockStyleModel';
import { positionById } from './BlockIdentity';
const supported = new Set(['paragraph', 'heading', 'blockquote', 'callout', 'bulletList', 'orderedList', 'taskList']);
export function BlockStyleDialog({ editor, position, onClose }: { editor: Editor; position?: number; onClose: () => void }) {
  const [targets] = useState(() => {
    const values: { pos: number; id?: string; type: string }[] = [];
    if (position !== undefined) {
      const node = position >= 0 && position < editor.state.doc.content.size ? editor.state.doc.nodeAt(position) : null;
      if (node && supported.has(node.type.name)) values.push({ pos: position, id: node.attrs.blockId, type: node.type.name });
    } else {
      const selection = editor.state.selection;
      editor.state.doc.nodesBetween(selection.from, selection.empty ? Math.min(selection.to + 1, editor.state.doc.content.size) : selection.to, (node, pos) => {
        if (supported.has(node.type.name)) { values.push({ pos, id: node.attrs.blockId, type: node.type.name }); return false; }
      });
    }
    return values;
  });
  const mapped = useRef(targets);
  const [first] = useState(() => targets[0] ? editor.state.doc.nodeAt(targets[0].pos) : null);
  const [background, setBackground] = useState(hexColor(first?.attrs.blockBackground) || '');
  const [color, setColor] = useState(hexColor(first?.attrs.blockTextColor) || '');
  const [indent, setIndent] = useState(blockIndent(first?.attrs.blockIndent));
  const [error, setError] = useState('');
  useEffect(() => {
    const map = ({ transaction }: { transaction: Transaction }) => {
      mapped.current = mapped.current.map(item => {
        if (item.id) return { ...item, pos: positionById(editor, item.id) ?? -1 };
        if (item.pos < 0) return item;
        const result = transaction.mapping.mapResult(item.pos, 1);
        return { ...item, pos: result.deleted ? -1 : result.pos };
      });
    };
    editor.on('transaction', map); return () => { editor.off('transaction', map); };
  }, [editor]);
  const save = () => {
    if (!editor.isEditable || !mapped.current.length) { setError('Choose a text, list, quote or callout block first.'); return; }
    const tr = editor.state.tr;
    for (const item of mapped.current) {
      const node = item.pos >= 0 && item.pos < tr.doc.content.size ? tr.doc.nodeAt(item.pos) : null;
      if (!node || node.type.name !== item.type) { setError('A target block changed or was deleted. Close and select it again.'); return; }
      tr.setNodeMarkup(item.pos, undefined, { ...node.attrs, blockBackground: hexColor(background), blockTextColor: hexColor(color), blockIndent: blockIndent(indent) });
    }
    editor.view.dispatch(tr); onClose();
  };
  return <ModalSurface title="Block color and indent" onClose={onClose}>
    <p className="dialog-hint">Applies to {targets.length} block(s). Text marks and comment anchors are preserved.</p>
    <label>Block background<div className="block-swatches">{blockColors.map(value => <button key={value} type="button"
      aria-label={value ? `Block background ${value}` : 'No block background'} aria-pressed={background === value}
      style={{ backgroundColor: value || undefined }} onClick={() => setBackground(value)}>{value ? '' : '\u00d7'}</button>)}</div></label>
    <label>Custom background<input aria-label="Custom block background" type="color" value={background || '#ffffff'} onChange={event => setBackground(event.target.value)}/></label>
    <label>Block text color<input aria-label="Block text color" type="color" value={color || '#293448'} onChange={event => setColor(event.target.value)}/></label>
    <label>Indent level<input aria-label="Block indent" type="number" min={0} max={8} value={indent} onChange={event => setIndent(blockIndent(Number(event.target.value)))}/></label>
    <div className="dialog-actions"><button type="button" onClick={() => { setBackground(''); setColor(''); setIndent(0); }}>Reset appearance</button>
      <button type="button" onClick={onClose}>Cancel</button><button type="button" onClick={save}>Apply style</button></div>
    {error && <p role="alert">{error}</p>}
  </ModalSurface>;
}
