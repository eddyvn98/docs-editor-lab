import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorView } from '@tiptap/pm/view';
import { headingSections, hiddenByHeading, revealHeadings } from './outlineModel';
import type { HeadingSection, OutlineBlock } from './outlineModel';

type FoldState = { ids: Set<string>; sections: HeadingSection[]; decorations: DecorationSet };
type FoldAction = { toggle?: string; all?: boolean; reveal?: number };
export const foldingKey = new PluginKey<FoldState>('documentHeadingFolding');
const STORAGE = 'docs-editor-lab-folding-v1';
function readFolds(): Set<string> {
  try { const value: unknown = JSON.parse(localStorage.getItem(STORAGE) || '[]');
    return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').slice(0, 2000) : []);
  } catch { return new Set(); }
}
export function documentHeadings(doc: PMNode): HeadingSection[] {
  const blocks: OutlineBlock[] = [];
  doc.forEach((node, pos) => blocks.push({ pos, size: node.nodeSize, type: node.type.name,
    text: node.textContent, level: Number(node.attrs.level), id: node.attrs.blockId || undefined }));
  return headingSections(blocks, doc.content.size);
}
function toggle(view: EditorView, id: string) {
  const state = foldingKey.getState(view.state);
  const section = state?.sections.find(item => item.id === id);
  if (!section) return;
  const tr = view.state.tr.setMeta(foldingKey, { toggle: id });
  const { from, to } = view.state.selection;
  if (!state?.ids.has(id) && to > section.bodyFrom && from < section.end) {
    tr.setSelection(TextSelection.near(tr.doc.resolve(section.pos + 1)));
  }
  view.dispatch(tr);
}
function build(doc: PMNode, ids: Set<string>): FoldState {
  const sections = documentHeadings(doc);
  const valid = new Set(sections.map(section => section.id));
  ids = new Set([...ids].filter(id => valid.has(id)));
  const decorations: Decoration[] = [];
  doc.forEach((node, pos) => {
    if (hiddenByHeading(pos, sections, ids)) {
      decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: 'fold-hidden', 'aria-hidden': 'true' }));
    }
  });
  for (const section of sections) {
    const folded = ids.has(section.id);
    decorations.push(Decoration.widget(section.pos + 1, view => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'heading-fold-toggle'; button.contentEditable = 'false';
      button.textContent = folded ? '\u25b8' : '\u25be';
      button.setAttribute('aria-label', `${folded ? 'Expand' : 'Collapse'} ${section.text || 'heading'}`);
      button.setAttribute('aria-expanded', String(!folded));
      button.addEventListener('pointerdown', event => event.preventDefault());
      button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); toggle(view, section.id); });
      return button;
    }, { side: -1, key: `fold-${section.id}-${folded}-${section.text}`, stopEvent: () => true }));
  }
  return { ids, sections, decorations: DecorationSet.create(doc, decorations) };
}
export const HeadingFolding = Extension.create({
  name: 'headingFolding',
  addProseMirrorPlugins() {
    return [new Plugin<FoldState>({
      key: foldingKey,
      state: {
        init: (_, state) => build(state.doc, readFolds()),
        apply(tr, previous, _old, next) {
          const action = tr.getMeta(foldingKey) as FoldAction | undefined;
          if (!tr.docChanged && !tr.selectionSet && !action) return previous;
          const sections = tr.docChanged ? documentHeadings(next.doc) : previous.sections;
          let ids = new Set(previous.ids);
          if (action?.all !== undefined) ids = new Set(action.all ? sections.map(s => s.id) : []);
          if (action?.toggle) { if (ids.has(action.toggle)) ids.delete(action.toggle); else ids.add(action.toggle); }
          if (action?.reveal !== undefined) ids = revealHeadings(action.reveal, sections, ids);
          if (tr.selectionSet && !action?.toggle && action?.all === undefined) ids = revealHeadings(next.selection.from, sections, ids);
          return build(next.doc, ids);
        },
      },
      props: { decorations: state => foldingKey.getState(state)?.decorations ?? DecorationSet.empty,
        handleKeyDown(view, event) {
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
            view.dispatch(view.state.tr.setMeta(foldingKey, { all: false }));
          }
          return false;
        },
      },
      view() { return { update(view, previous) {
        const next = foldingKey.getState(view.state), before = foldingKey.getState(previous);
        if (next === before || (next?.ids.size === before?.ids.size && [...(next?.ids || [])].every(id => before?.ids.has(id)))) return;
        try { localStorage.setItem(STORAGE, JSON.stringify([...(next?.ids || [])])); } catch { /* View-only preference. */ }
      } }; },
    })];
  },
});
export const toggleHeading = (editor: Editor, id: string) => toggle(editor.view, id);
export function expandHeadings(editor: Editor, collapsed = false) {
  const tr = editor.state.tr.setMeta(foldingKey, { all: collapsed });
  const parent = collapsed ? documentHeadings(tr.doc).find(s => editor.state.selection.from >= s.bodyFrom && editor.state.selection.from < s.end) : null;
  if (parent) tr.setSelection(TextSelection.near(tr.doc.resolve(parent.pos + 1)));
  editor.view.dispatch(tr);
}
export function goToHeading(editor: Editor, pos: number) {
  const tr = editor.state.tr.setMeta(foldingKey, { reveal: pos });
  tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(pos + 1, tr.doc.content.size))));
  editor.view.dispatch(tr.scrollIntoView());
  const element = editor.view.nodeDOM(pos);
  if (element instanceof HTMLElement) element.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
