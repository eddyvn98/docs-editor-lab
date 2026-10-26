import { useEffect, useRef, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { calloutIcon, calloutIcons, blockColors, blockCSS, hexColor } from './blockStyleModel';

const openCallouts = new WeakMap<NodeViewProps['editor'], string>();

function CalloutView({ node, editor, updateAttributes, getPos }: NodeViewProps) {
  const id = String(node.attrs.blockId || getPos());
  const [open, setOpen] = useState(() => !!id && openCallouts.get(editor) === id), ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const setAppearanceOpen = (value: boolean) => {
    if (value && id) openCallouts.set(editor, id);
    else if (id && openCallouts.get(editor) === id) openCallouts.delete(editor);
    setOpen(value);
  };
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as globalThis.Node)) setAppearanceOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const change = (attrs: Record<string, unknown>) => { if (editor.isEditable) updateAttributes(attrs); };
  const icon = calloutIcon(node.attrs.calloutIcon);
  return <NodeViewWrapper as="aside" data-type="callout" data-block-id={node.attrs.blockId}
    className="callout callout-card" style={blockCSS(node.attrs)}>
    <div ref={ref} className="callout-controls" contentEditable={false} data-node-controls data-ux-overlay
      onClick={event => event.stopPropagation()} onKeyDown={event => {
        if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setAppearanceOpen(false); trigger.current?.focus(); }
      }}>
      <button ref={trigger} type="button" className="callout-icon" aria-label="Callout appearance" aria-expanded={open}
        onClick={() => { if (editor.isEditable) setAppearanceOpen(!open); }}>{icon}</button>
      {open && editor.isEditable && <div className="callout-palette" role="group" aria-label="Callout settings">
        <strong>Callout</strong><div className="callout-icons" aria-label="Callout icons">{calloutIcons.map(value =>
          <button key={value} type="button" aria-label={`Icon ${value}`} aria-pressed={icon === value}
            onClick={() => change({ calloutIcon: value })}>{value}</button>)}</div>
        <label>Background<div className="block-swatches">{blockColors.map(value => <button key={value} type="button"
          aria-label={value ? `Callout background ${value}` : 'Default callout background'} style={{ backgroundColor: value || undefined }}
          onClick={() => change({ blockBackground: value || null })}>{value ? '' : '\u00d7'}</button>)}</div></label>
        <label>Text color<input aria-label="Callout text color" type="color" value={hexColor(node.attrs.blockTextColor) || '#293448'}
          onChange={event => change({ blockTextColor: event.target.value })}/></label>
        <label>Border color<input aria-label="Callout border color" type="color" value={hexColor(node.attrs.calloutBorder) || '#dce7fd'}
          onChange={event => change({ calloutBorder: event.target.value })}/></label>
        <button type="button" onClick={() => change({ calloutIcon: calloutIcons[0], blockTextColor: null, blockBackground: null, calloutBorder: null })}>Reset appearance</button>
        <button type="button" onClick={() => { setAppearanceOpen(false); trigger.current?.focus(); }}>Done</button>
      </div>}
    </div>
    <NodeViewContent className="callout-body"/>
  </NodeViewWrapper>;
}
export const CalloutBlock = Node.create({
  name: 'callout', group: 'block', content: 'block+', defining: true,
  addAttributes() { return {
    calloutIcon: { default: calloutIcons[0], parseHTML: element => calloutIcon(element.getAttribute('data-callout-icon')),
      renderHTML: attrs => ({ 'data-callout-icon': calloutIcon(attrs.calloutIcon) }) },
    calloutBorder: { default: null, parseHTML: element => hexColor(element.getAttribute('data-callout-border')),
      renderHTML: attrs => hexColor(attrs.calloutBorder) ? { 'data-callout-border': attrs.calloutBorder, style: `border-color:${hexColor(attrs.calloutBorder)}` } : {} },
  }; },
  parseHTML() { return [{ tag: 'aside[data-type="callout"]' }]; },
  renderHTML({ HTMLAttributes }) { return ['aside', mergeAttributes({ 'data-type': 'callout', class: 'callout' }, HTMLAttributes), 0]; },
  addNodeView() { return ReactNodeViewRenderer(CalloutView); },
});
