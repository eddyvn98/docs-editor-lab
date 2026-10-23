import type { Editor } from '@tiptap/react';
import { useEditorPulse } from './useEditorPulse';
import { selectTablePart } from './tableSelection';
import { Anchored } from './Anchored';
export function TableToolbar({ editor, readOnly }: { editor: Editor; readOnly: boolean }) {
  useEditorPulse(editor);
  if (readOnly || !editor.isActive('table')) return null;
  const at = editor.state.selection.$from;
  let depth = at.depth;
  while (depth > 0 && at.node(depth).type.name !== 'table') depth--;
  if (!depth) return null;
  const pos = at.before(depth), element = editor.view.nodeDOM(pos);
  if (!(element instanceof HTMLElement)) return null;
  const rect = element.getBoundingClientRect();
  const cell = editor.getAttributes(editor.isActive('tableHeader') ? 'tableHeader' : 'tableCell');
  const button = (label: string, action: () => void, enabled = true) => <button type="button" key={label} disabled={!enabled}
    onPointerDown={event => event.preventDefault()} onClick={() => { if (editor.isEditable) action(); }}>{label}</button>;
  return <Anchored editor={editor} className="contextual-table" anchor={{ element, pos,
    point: { x: rect.left, y: rect.top - 48 }, offset: { x: 0, y: -48 }, mode: 'pointer' }}>
    <div className="table-dock" role="toolbar" aria-label="Table formatting">
      <strong>Table</strong>
      {button('Select row', () => selectTablePart(editor, 'row'))}
      {button('Select column', () => selectTablePart(editor, 'column'))}
      {button('Select table', () => selectTablePart(editor, 'table'))}
      {button('+ Row', () => editor.chain().focus().addRowAfter().run())}
      {button('+ Column', () => editor.chain().focus().addColumnAfter().run())}
      {button('Merge', () => editor.chain().focus().mergeCells().run(), editor.can().mergeCells())}
      {button('Split', () => editor.chain().focus().splitCell().run(), editor.can().splitCell())}
      {button('Header row', () => editor.chain().focus().toggleHeaderRow().run())}
      <select aria-label="Cell background" value={cell.cellBackground || ''} onChange={event => editor.chain().focus().setCellAttribute('cellBackground', event.target.value || null).run()}>
        <option value="">No cell fill</option><option value="#e8f0fe">Blue</option><option value="#e7f4e8">Green</option><option value="#fff3ce">Yellow</option><option value="#f8e3e6">Pink</option><option value="#f1e8fa">Lavender</option>
      </select>
      <select aria-label="Cell vertical alignment" value={cell.verticalAlign || 'top'} onChange={event => editor.chain().focus().setCellAttribute('verticalAlign', event.target.value).run()}>
        <option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option>
      </select>
      {button('Delete row', () => editor.chain().focus().deleteRow().run())}
      {button('Delete column', () => editor.chain().focus().deleteColumn().run())}
    </div>
  </Anchored>;
}
