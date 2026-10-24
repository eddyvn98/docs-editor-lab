import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { documentMatches } from './docs-ui/searchModel';
import type { SearchOptions } from './docs-ui/searchModel';
type SearchState = SearchOptions & { query: string; current: number; decorations: DecorationSet };
export const searchKey = new PluginKey<SearchState>('documentSearch');
export const SearchHighlights = Extension.create({
  name: 'documentSearch',
  addProseMirrorPlugins() { return [new Plugin({
    key: searchKey,
    state: {
      init: () => ({ query: '', current: 0, decorations: DecorationSet.empty }),
      apply(tr, previous) {
        const next = tr.getMeta(searchKey) as Omit<SearchState, 'decorations'> | undefined;
        if (!next && !tr.docChanged) return previous;
        const value = next || previous;
        const options: SearchOptions = { caseSensitive: value.caseSensitive, wholeWord: value.wholeWord };
        const decorations = DecorationSet.create(tr.doc, documentMatches(tr.doc, value.query, options).map((range, index) =>
          Decoration.inline(range.from, range.to, { class: index === value.current ? 'search-match search-current' : 'search-match' })));
        return { ...value, decorations };
      },
    },
    props: { decorations: state => searchKey.getState(state)?.decorations ?? DecorationSet.empty },
  })]; },
});
