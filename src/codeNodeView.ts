import type { Node as PMNode } from '@tiptap/pm/model';
import type { EditorView, NodeView } from '@tiptap/pm/view';
import { codeLanguages, normalizeLanguage } from './codeTokens';
import { copyText } from './clipboard';

/** Preserve StarterKit's codeBlock schema, commands, history and input rules. */
export function codeNodeView(initial: PMNode, view: EditorView, getPos: () => number | undefined): NodeView {
  let node = initial;
  const dom = document.createElement('div'); dom.className = 'document-code-block';
  const header = document.createElement('div'); header.className = 'code-block-controls'; header.contentEditable = 'false';
  header.dataset.nodeControls = ''; header.dataset.uxOverlay = '';
  const language = document.createElement('select'); language.setAttribute('aria-label', 'Code language'); language.className = 'code-edit-control';
  for (const [value, label] of codeLanguages) { const option = document.createElement('option'); option.value = value; option.textContent = label; language.append(option); }
  const readonlyLanguage = document.createElement('span'); readonlyLanguage.className = 'code-read-language';
  const wrap = document.createElement('button'); wrap.type = 'button'; wrap.className = 'code-edit-control';
  wrap.setAttribute('aria-label', 'Wrap code lines');
  const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = 'Copy'; copy.setAttribute('aria-label', 'Copy code');
  const status = document.createElement('span'); status.className = 'code-copy-status'; status.setAttribute('role', 'status');
  const pre = document.createElement('pre'), code = document.createElement('code'); pre.append(code);
  header.append(language, readonlyLanguage, wrap, copy, status); dom.append(header, pre);
  function refresh() {
    if (node.attrs.blockId) dom.dataset.blockId = String(node.attrs.blockId); else delete dom.dataset.blockId;
    const normalized = normalizeLanguage(node.attrs.language);
    language.value = normalized;
    readonlyLanguage.textContent = codeLanguages.find(([value]) => value === normalized)?.[1] || 'Plain text';
    pre.dataset.wrap = String(node.attrs.wrap === true);
    wrap.textContent = node.attrs.wrap === true ? 'No wrap' : 'Wrap'; wrap.setAttribute('aria-pressed', String(node.attrs.wrap === true));
  }
  function update(attrs: Record<string, unknown>) {
    const pos = getPos();
    if (!view.editable || pos === undefined || view.state.doc.nodeAt(pos)?.type !== node.type) return;
    view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }));
  }
  language.addEventListener('change', () => update({ language: language.value === 'plaintext' ? null : language.value }));
  wrap.addEventListener('pointerdown', event => event.preventDefault());
  wrap.addEventListener('click', () => update({ wrap: node.attrs.wrap !== true }));
  copy.addEventListener('pointerdown', event => event.preventDefault());
  copy.addEventListener('click', () => {
    void copyText(node.textContent).then(() => { status.textContent = 'Copied'; }).catch(() => { status.textContent = 'Copy failed. Select the code and copy manually.'; });
  });
  header.addEventListener('click', event => event.stopPropagation());
  header.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); view.focus(); }
  });
  refresh();
  return { dom, contentDOM: code,
    update(next) { if (next.type !== node.type) return false; node = next; refresh(); return true; },
    stopEvent: event => header.contains(event.target as globalThis.Node),
    ignoreMutation: mutation => mutation.type !== 'selection' && header.contains(mutation.target),
  };
}
