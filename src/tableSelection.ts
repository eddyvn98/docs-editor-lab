import type { Editor } from '@tiptap/react';
import { CellSelection, TableMap } from '@tiptap/pm/tables';
export function selectTablePart(editor: Editor, part: 'row' | 'column' | 'table'): boolean {
  const selection = editor.state.selection;
  const anchor = selection instanceof CellSelection ? selection.$anchorCell : selection.$from;
  let depth = anchor.depth;
  while (depth > 0 && anchor.node(depth).type.name !== 'table') depth--;
  if (!depth) return false;
  const table = anchor.node(depth), start = anchor.start(depth), map = TableMap.get(table);
  let cell = selection instanceof CellSelection ? selection.$anchorCell.pos : -1;
  if (cell < 0) {
    for (let d = anchor.depth; d > depth; d--) {
      if (['tableCell', 'tableHeader'].includes(anchor.node(d).type.name)) { cell = anchor.before(d); break; }
    }
  }
  if (cell < start) return false;
  try {
    const rect = map.findCell(cell - start);
    const first = part === 'table' ? 0 : part === 'row' ? rect.top * map.width : rect.left;
    const last = part === 'table' ? map.map.length - 1 : part === 'row' ? rect.bottom * map.width - 1 : (map.height - 1) * map.width + rect.right - 1;
    editor.view.dispatch(editor.state.tr.setSelection(CellSelection.create(editor.state.doc, start + map.map[first], start + map.map[last])));
    editor.view.focus(); return true;
  } catch { return false; }
}
