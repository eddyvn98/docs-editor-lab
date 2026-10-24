import { useEffect, useRef, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Check, Code, X } from 'lucide-react';
import { renderMath } from './mathRenderer';
import { t, useDocsLocale } from '../docs-ui/locale';
import { useEditorPulse } from '../useEditorPulse';
function MathPreview({ source, block }: { source: string; block: boolean }) {
  const ref = useRef<HTMLSpanElement>(null), [error, setError] = useState('');
  useEffect(() => {
    if (!ref.current) return;
    try { ref.current.replaceChildren(renderMath(source, block)); setError(''); }
    catch (cause) { ref.current.textContent = source; setError(cause instanceof Error ? cause.message : 'Invalid equation.'); }
  }, [source, block]);
  return <span className="docs-math-preview"><span ref={ref}/>{error && <span className="docs-equation-error" role="status">{error}</span>}</span>;
}
function EquationView({ node, editor, updateAttributes, selected }: NodeViewProps) {
  useEditorPulse(editor); useDocsLocale();
  const block = node.type.name === 'equation', [open, setOpen] = useState(!node.attrs.latex), [source, setSource] = useState(String(node.attrs.latex || ''));
  useEffect(() => { if (!editor.isEditable) setOpen(false); }, [editor.isEditable]);
  const close = () => { setOpen(false); editor.view.focus(); };
  const save = () => { if (editor.isEditable) updateAttributes({ latex: source.slice(0, 10_000) }); close(); };
  return <NodeViewWrapper as={block ? 'div' : 'span'} className={`${block ? 'docs-equation' : 'docs-inline-equation'} ${selected ? 'is-selected' : ''}`} data-type={node.type.name} data-block-id={node.attrs.blockId} contentEditable={false}>
    <button className="docs-equation-display" disabled={!editor.isEditable} aria-label="Edit equation" onClick={() => { setSource(String(node.attrs.latex || '')); setOpen(value => !value); }}>
      {node.attrs.latex ? <MathPreview source={String(node.attrs.latex)} block={block}/> : <span className="docs-muted"><Code size={16}/>{t('Add equation')}</span>}</button>
    {open && editor.isEditable && <span className="docs-equation-editor" data-node-controls onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); save(); }
    }}>
      <label>{t('Equation source')}<textarea aria-label="Equation source" autoFocus spellCheck={false} value={source} maxLength={10_000} placeholder="E = mc^2" onChange={event => setSource(event.target.value)}/></label>
      <span className="docs-equation-live"><MathPreview source={source} block={block}/></span>
      <span className="docs-equation-actions"><button onClick={save}><Check size={14}/>{t('Save')}</button><button onClick={close}><X size={14}/>{t('Cancel')}</button></span>
    </span>}
  </NodeViewWrapper>;
}
function equation(name: string, inline: boolean) { return Node.create({
  name, group: inline ? 'inline' : 'block', inline, atom: true, draggable: !inline,
  addAttributes() { return { latex: { default: '', parseHTML: element => (element.getAttribute('data-latex') || '').slice(0, 10_000), renderHTML: attrs => ({ 'data-latex': String(attrs.latex || '').slice(0, 10_000) }) } }; },
  parseHTML() { return [{ tag: `${inline ? 'span' : 'div'}[data-type="${name}"]` }]; },
  renderHTML({ node, HTMLAttributes }) {
    const source = String(node.attrs.latex || ''); let content: Element | string;
    try { content = renderMath(source, !inline); } catch { content = source; }
    return [inline ? 'span' : 'div', mergeAttributes(HTMLAttributes, { 'data-type': name, class: inline ? 'docs-inline-equation' : 'docs-equation' }), content];
  },
  addNodeView() { return ReactNodeViewRenderer(EquationView); },
}); }
export const Equation = equation('equation', false), InlineEquation = equation('inlineEquation', true);
