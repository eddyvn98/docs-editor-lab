import type { Editor } from '@tiptap/react';
import type { Anchor } from './targets';
import { Anchored } from './Anchored';
import { requestDocs } from './docsEvents';
export function SelectionToolbar({ editor, anchor, onLink, onComment }: {
  editor: Editor; anchor: Anchor; onLink: () => void; onComment: () => void;
}) {
  const restore = () => {
    if (anchor.from !== undefined && anchor.to !== undefined) editor.commands.setTextSelection({ from: anchor.from, to: anchor.to });
  };
  const button = (label: string, run: () => void, active = false, title = label) => <button key={label} type="button" aria-label={label}
    title={title} aria-pressed={active} className={active ? 'active' : ''} onPointerDown={e => e.preventDefault()}
    onClick={() => { restore(); run(); }}>{label}</button>;
  const style = editor.isActive('heading') ? `h${editor.getAttributes('heading').level}` : 'paragraph';
  return <Anchored anchor={anchor} editor={editor} className="selection-bar contextual-format">
    <div role="toolbar" aria-label="Selection formatting" className="selection-controls">
      <select aria-label="Selected text style" value={style} onChange={event => {
        restore(); const value = event.target.value;
        if (value === 'paragraph') editor.chain().focus().setParagraph().run();
        else editor.chain().focus().setHeading({ level: Number(value[1]) as 1 | 2 | 3 }).run();
      }}><option value="paragraph">Text</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option></select>
      {button('B', () => { editor.chain().focus().toggleBold().run(); }, editor.isActive('bold'), 'Bold')}
      {button('I', () => { editor.chain().focus().toggleItalic().run(); }, editor.isActive('italic'), 'Italic')}
      {button('U', () => { editor.chain().focus().toggleUnderline().run(); }, editor.isActive('underline'), 'Underline')}
      {button('S', () => { editor.chain().focus().toggleStrike().run(); }, editor.isActive('strike'), 'Strikethrough')}
      {button('Code', () => { editor.chain().focus().toggleCode().run(); }, editor.isActive('code'))}
      {button('Highlight', () => { editor.chain().focus().toggleHighlight().run(); }, editor.isActive('highlight'))}
      <select aria-label="Selection alignment" value={editor.getAttributes(editor.isActive('heading') ? 'heading' : 'paragraph').textAlign || 'left'}
        onChange={event => { restore(); editor.chain().focus().setTextAlign(event.target.value).run(); }}>
        <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
      </select>
      <div className="color-tools" aria-label="Text color palette">
        {['#27344b', '#e2585b', '#2975d9'].map(color => <button key={color} type="button" aria-label={`Text color ${color}`}
          onPointerDown={event => event.preventDefault()} onClick={() => { restore(); editor.chain().focus().setColor(color).run(); }}>
          <span className="color-swatch" style={{ background: color }}/></button>)}
        {['#fff3b0', '#dcecff'].map(color => <button key={color} type="button" aria-label={`Background color ${color}`}
          onPointerDown={event => event.preventDefault()} onClick={() => { restore(); editor.chain().focus().setBackgroundColor(color).run(); }}>
          <span className="color-swatch" style={{ background: color }}/></button>)}
      </div>
      {button('List', () => { editor.chain().focus().toggleBulletList().run(); }, editor.isActive('bulletList'))}
      {button('Checklist', () => { editor.chain().focus().toggleTaskList().run(); }, editor.isActive('taskList'))}
      {button('Block style', () => requestDocs(editor, { action: 'block-style' }))}
      {button('Save template', () => requestDocs(editor, { action: 'template-save' }))}
      {button('Clear format', () => { editor.chain().focus().unsetBold().unsetItalic().unsetUnderline().unsetStrike().unsetCode().unsetHighlight().unsetColor().unsetBackgroundColor().run(); })}
      {button('Link', onLink)}{button('Comment', onComment)}
    </div>
  </Anchored>;
}
