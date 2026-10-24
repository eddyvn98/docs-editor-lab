import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { codeLanguages, normalizeLanguage, tokenizeCode } from './codeTokens';
import { codeNodeView } from './codeNodeView';

export const codeBlockHighlightKey = new PluginKey<DecorationSet>('docsCodeBlockHighlight');

export const CodeBlockTools = Extension.create({
  name: 'codeBlockTools',
  addGlobalAttributes() { return [{ types: ['codeBlock'], attributes: {
    wrap: { default: false, parseHTML: element => element.getAttribute('data-wrap') === 'true',
      renderHTML: attrs => ({ 'data-wrap': String(attrs.wrap === true), style: attrs.wrap === true ? 'white-space:pre-wrap' : 'white-space:pre' }) },
  } }]; },
  addProseMirrorPlugins() {
    const cache = new WeakMap<PMNode, ReturnType<typeof tokenizeCode>>();
    const decorate = (doc: PMNode) => {
      const values: Decoration[] = [];
      doc.descendants((node, pos) => {
        if (node.type.name !== 'codeBlock') return;
        let tokens = cache.get(node);
        if (!tokens) { tokens = tokenizeCode(node.textContent, node.attrs.language); cache.set(node, tokens); }
        for (const token of tokens) values.push(Decoration.inline(pos + 1 + token.from, pos + 1 + token.to, { class: `code-token-${token.kind}` }));
        return false;
      });
      return DecorationSet.create(doc, values);
    };
    return [new Plugin<DecorationSet>({
      key: codeBlockHighlightKey,
      state: { init: (_, state) => decorate(state.doc), apply: (tr, old) => tr.docChanged ? decorate(tr.doc) : old },
      props: { decorations(state) { return codeBlockHighlightKey.getState(state) ?? DecorationSet.empty; }, nodeViews: { codeBlock: codeNodeView } },
    })];
  },
});
export { codeLanguages, normalizeLanguage };
