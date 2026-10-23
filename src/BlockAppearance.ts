import { Extension } from '@tiptap/core';
import { hexColor, blockIndent } from './blockStyleModel';
export const BlockAppearance = Extension.create({
  name: 'blockAppearance',
  addGlobalAttributes() { return [{ types: ['paragraph', 'heading', 'blockquote', 'callout', 'bulletList', 'orderedList', 'taskList'], attributes: {
    blockBackground: { default: null, parseHTML: element => hexColor(element.getAttribute('data-block-background')),
      renderHTML: attrs => hexColor(attrs.blockBackground) ? { 'data-block-background': hexColor(attrs.blockBackground), style: `background-color:${hexColor(attrs.blockBackground)}` } : {} },
    blockTextColor: { default: null, parseHTML: element => hexColor(element.getAttribute('data-block-color')),
      renderHTML: attrs => hexColor(attrs.blockTextColor) ? { 'data-block-color': hexColor(attrs.blockTextColor), style: `color:${hexColor(attrs.blockTextColor)}` } : {} },
    blockIndent: { default: 0, parseHTML: element => blockIndent(Number(element.getAttribute('data-block-indent') || 0)),
      renderHTML: attrs => blockIndent(attrs.blockIndent) ? { 'data-block-indent': String(blockIndent(attrs.blockIndent)), style: `margin-inline-start:min(${blockIndent(attrs.blockIndent) * 1.5}em,35%)` } : {} },
  } }]; },
});
