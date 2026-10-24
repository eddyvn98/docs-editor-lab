import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { Fragment, Slice } from '@tiptap/pm/model';
import type { Node as PMNode } from '@tiptap/pm/model';
/** Ordinary paste copies content, not another document's comment/review identities. */
export const ClipboardClean = Extension.create({
  name: 'docsClipboardClean',
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [new Plugin({ props: { transformPasted(slice) {
      const insideSync = Array.from({ length: editor.state.selection.$from.depth }, (_, index) => editor.state.selection.$from.node(index + 1).type.name).includes('syncedBlock');
      function clean(node: PMNode, inSync: boolean): PMNode[] {
        if (node.attrs.reviewKind === 'delete' || node.marks.some(mark => mark.type.name === 'suggestion' && mark.attrs.kind === 'delete')) return [];
        const marks = node.marks.filter(mark => !['comment','suggestion'].includes(mark.type.name));
        if (node.isText) return [node.mark(marks)];
        const children: PMNode[] = []; node.forEach(child => children.push(...clean(child, inSync || node.type.name === 'syncedBlock')));
        if (node.type.name === 'syncedBlock' && inSync) return children;
        const attrs: Record<string, unknown> = { ...node.attrs, blockId: null, reviewId: null, reviewKind: null, reviewAt: null };
        if (node.type.name === 'syncedBlock') attrs.syncId = crypto.randomUUID();
        // Preserve an open fragment's shape. The paste fitting algorithm fills open ancestors.
        return [node.type.create(attrs, Fragment.from(children), marks)];
      }
      const nodes: PMNode[] = []; slice.content.forEach(node => nodes.push(...clean(node, insideSync)));
      if (!nodes.length) return Slice.empty;
      const fragment = Fragment.from(nodes), maximum = Slice.maxOpen(fragment);
      return new Slice(fragment, Math.min(slice.openStart, maximum.openStart), Math.min(slice.openEnd, maximum.openEnd));
    } } })];
  },
});
