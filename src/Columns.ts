import { Node, mergeAttributes } from '@tiptap/core';
import { createColumnsView } from './docs-content/columnsView';
import { columnTracks, columnWidths, readWidths } from './docs-content/columnWidths';
export const Column = Node.create({
  name: 'column', content: 'block+', isolating: true,
  parseHTML() { return [{ tag: 'div[data-type="column"]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes({ 'data-type': 'column', class: 'doc-column' }, HTMLAttributes), 0]; },
});
export const Columns = Node.create({
  name: 'columns', group: 'block', content: 'column{2,6}', isolating: true, defining: true,
  addAttributes() { return { widths: { default: null, parseHTML: element => readWidths(element.getAttribute('data-widths')), renderHTML: () => ({}) } }; },
  parseHTML() { return [{ tag: 'div[data-type="columns"]' }]; },
  renderHTML({ node, HTMLAttributes }) {
    const widths = columnWidths(node.attrs.widths, node.childCount);
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'columns', 'data-widths': JSON.stringify(widths), class: 'doc-columns',
      style: `display:grid;grid-template-columns:${columnTracks(widths)};gap:24px` }), 0];
  },
  addNodeView() { return createColumnsView; },
});
