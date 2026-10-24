import { Node, mergeAttributes } from '@tiptap/core';
import type { JSONContent } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';
import type { Node as PMNode } from '@tiptap/pm/model';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Copy, Link2, Unlink } from 'lucide-react';
import { useEditorPulse } from '../useEditorPulse';
import { t, useDocsLocale } from '../docs-ui/locale';
function copies(doc: PMNode) {
  const list: { pos: number; node: PMNode }[] = [];
  doc.descendants((node, pos) => { if (node.attrs.reviewKind === 'delete') return false; if (node.type.name === 'syncedBlock') { list.push({ pos, node }); return false; } }); return list;
}
function normalized(content: JSONContent): JSONContent {
  const attrs = { ...content.attrs }; delete attrs.blockId;
  return { ...content, attrs: Object.keys(attrs).length ? attrs : undefined, content: content.content?.map(normalized) };
}
const signature = (node: PMNode) => JSON.stringify(node.content.toJSON().map((value: JSONContent) => normalized(value)));
function SyncedView({ editor, node, getPos }: NodeViewProps) {
  useEditorPulse(editor); useDocsLocale();
  const count = copies(editor.state.doc).filter(copy => copy.node.attrs.syncId === node.attrs.syncId).length;
  const act = (unlink: boolean) => {
    const pos = getPos(); if (!editor.isEditable || typeof pos !== 'number') return;
    const current = editor.state.doc.nodeAt(pos); if (current?.type.name !== 'syncedBlock' || current.attrs.blockId !== node.attrs.blockId) return;
    const tr = closeHistory(editor.state.tr);
    if (unlink) tr.replaceWith(pos, pos + current.nodeSize, current.content);
    else tr.insert(pos + current.nodeSize, current.type.create({ ...current.attrs, blockId: null }, current.content));
    editor.view.dispatch(tr.scrollIntoView());
  };
  return <NodeViewWrapper className="docs-synced-block" data-type="syncedBlock" data-block-id={node.attrs.blockId}>
    <div className="docs-synced-tools" contentEditable={false} data-node-controls><Link2 size={15}/><span>{t('Synced block')} <small>{count} {t('copies in this document')}</small></span>
      {editor.isEditable && <><button onClick={() => act(false)}><Copy size={14}/>{t('Linked copy')}</button><button onClick={() => act(true)}><Unlink size={14}/>{t('Unlink')}</button></>}</div>
    <NodeViewContent/>
  </NodeViewWrapper>;
}
export const SyncedBlock = Node.create({
  name: 'syncedBlock', group: 'block', content: 'block+', isolating: true, defining: true,
  addAttributes() { return { syncId: { default: null, parseHTML: element => element.getAttribute('data-sync-id'), renderHTML: attrs => ({ 'data-sync-id': attrs.syncId || '' }) } }; },
  parseHTML() { return [{ tag: 'div[data-type="syncedBlock"]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'syncedBlock', class: 'docs-synced-block' }), 0]; },
  addNodeView() { return ReactNodeViewRenderer(SyncedView); },
  onCreate() { this.editor.view.dispatch(this.editor.state.tr.setMeta('initializeSyncedBlocks', true).setMeta('addToHistory', false)); },
  addProseMirrorPlugins() { return [new Plugin({ key: new PluginKey('docsSyncedBlockPlugin'),
    appendTransaction(transactions, oldState, state) {
      const initialize = transactions.some(tr => tr.getMeta('initializeSyncedBlocks'));
      if (!initialize && !transactions.some(tr => tr.docChanged && !tr.getMeta('synced-propagation') && tr.getMeta('addToHistory') !== false)) return null;
      const current = copies(state.doc), old = copies(oldState.doc), tr = state.tr.setMeta('synced-propagation', true);
      const groups = new Map<string, typeof current>();
      for (const copy of current) {
        const id = typeof copy.node.attrs.syncId === 'string' && /^[\w-]{1,80}$/.test(copy.node.attrs.syncId) ? copy.node.attrs.syncId : crypto.randomUUID();
        if (id !== copy.node.attrs.syncId) tr.setNodeMarkup(copy.pos, undefined, { ...copy.node.attrs, syncId: id });
        groups.set(id, [...(groups.get(id) || []), copy]);
      }
      if (initialize) return tr.docChanged ? tr.setMeta('addToHistory', false) : null;
      const updates: { pos: number; size: number; source: PMNode }[] = [];
      for (const group of groups.values()) {
        if (group.length < 2) continue;
        const source = group.find(copy => { const previous = old.find(item => item.node.attrs.blockId === copy.node.attrs.blockId); return previous && signature(previous.node) !== signature(copy.node); }) || group[0];
        for (const target of group) if (target !== source && signature(target.node) !== signature(source.node)) updates.push({ pos: target.pos, size: target.node.nodeSize, source: source.node });
      }
      for (const update of updates.sort((a, b) => b.pos - a.pos)) tr.replaceWith(update.pos + 1, update.pos + update.size - 1, update.source.content);
      return tr.docChanged ? tr : null;
    },
  })]; },
});
