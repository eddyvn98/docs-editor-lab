import { Extension } from '@tiptap/core';
const color = (value: unknown) => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value : null;
export const DocumentAppearance = Extension.create({
  name: 'documentAppearance',
  addGlobalAttributes() {
    return [{ types: ['tableCell', 'tableHeader'], attributes: {
      cellBackground: { default: null, parseHTML: element => color(element.getAttribute('data-cell-background')),
        renderHTML: attrs => color(attrs.cellBackground) ? { 'data-cell-background': attrs.cellBackground, style: `background-color:${attrs.cellBackground}` } : {} },
      verticalAlign: { default: null, parseHTML: element => ['top', 'middle', 'bottom'].includes(element.style.verticalAlign) ? element.style.verticalAlign : null,
        renderHTML: attrs => ['top', 'middle', 'bottom'].includes(attrs.verticalAlign) ? { style: `vertical-align:${attrs.verticalAlign}` } : {} },
    } }, { types: ['paragraph', 'heading'], attributes: {
      lineSpacing: { default: null, parseHTML: element => ['1.2', '1.5', '1.8', '2'].includes(element.style.lineHeight) ? element.style.lineHeight : null,
        renderHTML: attrs => ['1.2', '1.5', '1.8', '2'].includes(attrs.lineSpacing) ? { style: `line-height:${attrs.lineSpacing}` } : {} },
    } }];
  },
});
