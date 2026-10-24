import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { t } from '../docs-ui/locale';

export const SlashPlaceholder = Extension.create({
  name: 'slashPlaceholder',
  addProseMirrorPlugins() {
    return [new Plugin({
      props: {
        decorations(state) {
          const { $from } = state.selection;
          const paragraph = $from.parent;
          if (paragraph.type.name !== 'paragraph' || paragraph.content.size > 0) return DecorationSet.empty;
          const from = $from.before($from.depth);
          return DecorationSet.create(state.doc, [Decoration.node(from, from + paragraph.nodeSize, {
            'data-docs-placeholder': t("Type '/' for commands"),
          })]);
        },
      },
    })];
  },
});
