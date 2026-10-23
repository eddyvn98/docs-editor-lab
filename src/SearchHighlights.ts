import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { findMatches } from "./documentUtils";
export const searchKey = new PluginKey<{ query: string; current: number; decorations: DecorationSet }>("documentSearch");
export const SearchHighlights = Extension.create({
  name: "documentSearch",
  addProseMirrorPlugins() {
    return [new Plugin({
      key: searchKey,
      state: {
        init: () => ({ query: "", current: 0, decorations: DecorationSet.empty }),
        apply(tr, previous) {
          const next = tr.getMeta(searchKey) as { query: string; current: number } | undefined;
          if (!next && !tr.docChanged) return previous;
          const { query, current } = next || previous;
          const decorations = DecorationSet.create(tr.doc, findMatches(tr.doc, query).map((match, i) =>
            Decoration.inline(match.from, match.to, { class: i === current ? "search-match search-current" : "search-match" })));
          return { query, current, decorations };
        },
      },
      props: { decorations: state => searchKey.getState(state)?.decorations || null },
    })];
  },
});
