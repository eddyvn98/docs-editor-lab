import type { Editor } from '@tiptap/react';
import { useEditorPulse } from './useEditorPulse';
import { selectTablePart } from './tableSelection';
export function TableToolbar({ editor, readOnly }: { editor: Editor; readOnly: boolean }) {
  useEditorPulse(editor);
  if (readOnly || !editor.isActive('table')) return null;
  const cell = editor.getAttributes(editor.isActive('tableHeader') ? 'tableHeader' : 'tableCell');
  const button = (label: string, action: () => void, enabled = true) => <button type="button" key={label} disabled={!enabled}
    onPointerDown={e => e.preventDefault()} onClick={action}>{label}</button>;
  return <div className="table-dock" role="toolbar" aria-label="Table formatting">
    <strong>Table</strong>
    {button('Select row', () => selectTablePart(editor, 'row'))}
    {button('Select column', () => selectTablePart(editor, 'column'))}
    {button('Select table', () => selectTablePart(editor, 'table'))}
    {button('+ Row', () => editor.chain().focus().addRowAfter().run())}
    {button('+ Column', () => editor.chain().focus().addColumnAfter().run())}
    {button('Merge', () => editor.chain().focus().mergeCells().run(), editor.can().mergeCells())}
    {button('Split', () => editor.chain().focus().splitCell().run(), editor.can().splitCell())}
    {button('Header row', () => editor.chain().focus().toggleHeaderRow().run())}
    <select aria-label="Cell background" value={cell.cellBackground || ""} onChange={e => editor.chain().focus().setCellAttribute('cellBackground', e.target.value || null).run()}>
      <option value="">No cell fill</option><option value="#e8f0fe">Blue</option><option value="#e7f4e8">Green</option><option value="#fff3ce">Yellow</option><option value="#f8e3e6">Pink</option><option value="#f1e8fa">Lavender</option>
    </select>
    <select aria-label="Cell vertical alignment" value={cell.verticalAlign || "top"} onChange={e => editor.chain().focus().setCellAttribute('verticalAlign', e.target.value).run()}>
      <option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option>
    </select>
    {button('Delete row', () => editor.chain().focus().deleteRow().run())}
    {button('Delete column', () => editor.chain().focus().deleteColumn().run())}
  </div>;
}
