import type { Editor } from '@tiptap/react';
import { useLayoutEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useEditorPulse } from './useEditorPulse';

type Props = { editor: Editor; readOnly: boolean; onInsert: () => void; onLink: () => void; onComment: () => void; onHelp: () => void };
export function FormatBar({ editor, readOnly, onInsert, onLink, onComment, onHelp }: Props) {
  useEditorPulse(editor);
  const dock = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = dock.current; if (!element) return;
    const root = element.closest<HTMLElement>('.app-shell');
    const measure = () => root?.style.setProperty('--format-height', `${element.getBoundingClientRect().height}px`);
    measure(); const observer = new ResizeObserver(measure); observer.observe(element);
    return () => observer.disconnect();
  }, [readOnly]);
  if (readOnly) return <div ref={dock} className="reading-strip" role="status">Reading mode <span>Local view only. Your document is not shared.</span></div>;
  const mark = editor.getAttributes('textStyle');
  const block = editor.isActive('heading') ? `h${editor.getAttributes('heading').level}` : editor.isActive('codeBlock') ? 'code' : 'paragraph';
  const button = (label: string, text: string, run: () => void, active = false, disabled = false) => <button type="button" key={label}
    title={label} aria-label={label} aria-pressed={active} disabled={disabled} className={active ? 'is-active' : ''}
    onPointerDown={e => e.preventDefault()} onClick={() => { if (editor.isEditable) run(); }}>{text}</button>;
  const clearFormatting = () => editor.chain().focus().command(({ tr, state }) => {
    for (const name of ['bold', 'italic', 'underline', 'strike', 'code', 'highlight', 'textStyle']) {
      const type = state.schema.marks[name]; if (!type) continue;
      if (state.selection.empty) tr.removeStoredMark(type);
      else for (const range of state.selection.ranges) tr.removeMark(range.$from.pos, range.$to.pos, type);
    }
    return true;
  }).run();
  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || !(event.target instanceof HTMLButtonElement)) return;
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    const index = buttons.indexOf(event.target);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  };
  return <div ref={dock} className="format-dock" role="toolbar" aria-label="Document formatting" onKeyDown={navigate}>
    <div className="format-group">
      {button('Insert block', '+ Insert', onInsert)}
      <select aria-label="Paragraph style" value={block} onChange={e => {
        const value = e.target.value, chain = editor.chain().focus();
        if (value === 'code') chain.toggleCodeBlock().run();
        else if (value === 'paragraph') chain.setParagraph().run();
        else chain.setHeading({ level: Number(value[1]) as 1 | 2 | 3 }).run();
      }}><option value="paragraph">Normal text</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="code">Code block</option></select>
    </div>
    <div className="format-group">
      <select aria-label="Font family" value={['Arial', 'Georgia', 'monospace'].includes(mark.fontFamily) ? mark.fontFamily : ''}
        onChange={e => editor.chain().focus().setMark('textStyle', { fontFamily: e.target.value || null }).run()}>
        <option value="">Default font</option><option>Arial</option><option>Georgia</option><option value="monospace">Monospace</option>
      </select>
      <select aria-label="Font size" value={['12px', '14px', '16px', '18px', '24px', '32px'].includes(mark.fontSize) ? mark.fontSize : ''}
        onChange={e => editor.chain().focus().setMark('textStyle', { fontSize: e.target.value || null }).run()}>
        <option value="">Size</option>{[12, 14, 16, 18, 24, 32].map(size => <option key={size} value={`${size}px`}>{size}</option>)}
      </select>
    </div>
    <div className="format-group">
      {button('Bold', 'B', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
      {button('Italic', 'I', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
      {button('Underline', 'U', () => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'))}
      {button('Strikethrough', 'S', () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'))}
      {button('Inline code', '<>', () => editor.chain().focus().toggleCode().run(), editor.isActive('code'))}
      <select aria-label="Text color" value={['#252b35', '#d13b40', '#2667cb', '#237948', '#8d46b7'].includes(mark.color) ? mark.color : ''}
        onChange={e => { const c = editor.chain().focus(); e.target.value ? c.setColor(e.target.value).run() : c.unsetColor().run(); }}>
        <option value="">Text color</option><option value="#252b35">Charcoal</option><option value="#d13b40">Red</option><option value="#2667cb">Blue</option><option value="#237948">Green</option><option value="#8d46b7">Purple</option>
      </select>
      <select aria-label="Highlight color" value={editor.getAttributes('highlight').color || ''}
        onChange={e => { const c = editor.chain().focus(); e.target.value ? c.setHighlight({ color: e.target.value }).run() : c.unsetHighlight().run(); }}>
        <option value="">Highlight</option><option value="#fff3b0">Yellow</option><option value="#dcecff">Blue</option><option value="#dcf3dc">Green</option><option value="#f5def5">Pink</option>
      </select>
    </div>
    <div className="format-group">
      {button('Bullet list', '\u2022 List', () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'))}
      {button('Numbered list', '1. List', () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'))}
      {button('Checklist', '\u2611', () => editor.chain().focus().toggleTaskList().run(), editor.isActive('taskList'))}
      {button('Quote', '\u201c', () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'))}
      <select aria-label="Text alignment" value={editor.getAttributes(editor.isActive('heading') ? 'heading' : 'paragraph').textAlign || 'left'}
        onChange={e => editor.chain().focus().setTextAlign(e.target.value).run()}>
        <option value="left">Align left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justify</option>
      </select>
      <select aria-label="Line spacing" value={editor.getAttributes(editor.isActive('heading') ? 'heading' : 'paragraph').lineSpacing || ''}
        onChange={e => editor.chain().focus().updateAttributes(editor.isActive('heading') ? 'heading' : 'paragraph', { lineSpacing: e.target.value || null }).run()}>
        <option value="">Line spacing</option>{['1.2', '1.5', '1.8', '2'].map(size => <option key={size}>{size}</option>)}
      </select>
    </div>
    <div className="format-group">
      {button('Add link', 'Link', onLink)}{button('Add comment', 'Comment', onComment)}
      {button('Clear text formatting', 'Clear', clearFormatting)}
      {button('Keyboard shortcuts', '?', onHelp)}
    </div>
  </div>;
}
