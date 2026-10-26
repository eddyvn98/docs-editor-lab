import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { AlignCenter, AlignLeft, AlignRight, Bold, CheckSquare, ChevronDown, Code2, Highlighter, IndentDecrease, IndentIncrease, Italic, Link2, List, ListOrdered, MessageSquare, MoreHorizontal, Palette, Strikethrough, Underline, X } from 'lucide-react';
import type { Anchor } from './targets';
import { Anchored } from './Anchored';
import { requestDocs } from './docsEvents';
import { t, useDocsLocale } from './docs-ui/locale';
const colors = ['#1f2329','#646a73','#d83931','#d87021','#b58c00','#2e7d32','#007f82','#245bdb','#7b35c7','#b33381'];
const backgrounds = ['#ffffff','#f2f3f5','#ffe2e0','#ffedcf','#fff5b3','#d9f5d6','#d5f6f2','#dce8ff','#ede0ff','#ffdded'];
export function SelectionToolbar({ editor, anchor, onLink, onComment }: { editor: Editor; anchor: Anchor; onLink: () => void; onComment: () => void }) {
  useDocsLocale();
  const [panel, setPanel] = useState<'alignment' | 'color' | 'more' | null>(null);
  const restore = () => {
    if (anchor.from === undefined || anchor.to === undefined || anchor.from >= anchor.to || anchor.to > editor.state.doc.content.size) return false;
    // Re-focus before dispatching selection so popovers keep their saved range.
    editor.view.focus();
    return editor.commands.setTextSelection({ from: anchor.from, to: anchor.to });
  };
  const run = (action: () => void) => { if (editor.isEditable && restore()) action(); };
  const changeIndent = (delta: number) => {
    if (editor.isActive('listItem') || editor.isActive('taskItem')) {
      const type = editor.isActive('taskItem') ? 'taskItem' : 'listItem';
      run(() => { if (delta > 0) editor.chain().focus().sinkListItem(type).run(); else editor.chain().focus().liftListItem(type).run(); });
      return;
    }
    run(() => {
      const selection = editor.state.selection, updates: Array<{ pos: number; node: typeof editor.state.doc }> = [];
      editor.state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
        if ((node.type.name === 'paragraph' || node.type.name === 'heading') && typeof node.attrs.blockIndent === 'number') updates.push({ pos, node });
      });
      if (!updates.length) return;
      const tr = editor.state.tr;
      for (const { pos, node } of updates) tr.setNodeMarkup(pos, undefined, { ...node.attrs, blockIndent: Math.max(0, Math.min(8, node.attrs.blockIndent + delta)) });
      editor.view.dispatch(tr);
    });
  };
  const dismiss = () => { setPanel(null); editor.chain().focus().setTextSelection(anchor.to ?? editor.state.selection.to).run(); };
  const button = (label: string, Icon: typeof Bold, action: () => void, active = false, shortcut = '') => <button key={label} type="button" aria-label={label} title={`${t(label)}${shortcut ? ` (${shortcut})` : ''}`} aria-pressed={active} className={active ? 'active' : ''} onPointerDown={event => event.preventDefault()} onClick={() => run(action)}><Icon size={17}/></button>;
  const style = editor.isActive('heading') ? `h${editor.getAttributes('heading').level}` : 'paragraph';
  const AlignmentIcon = editor.isActive({ textAlign: 'center' }) ? AlignCenter : editor.isActive({ textAlign: 'right' }) ? AlignRight : AlignLeft;
  return <Anchored anchor={anchor} editor={editor} className="selection-bar contextual-format docs-selection-toolbar" overflowVisible>
    <div role="toolbar" aria-label="Selection formatting" className="selection-controls">
      <select aria-label="Selected text style" value={style} onChange={event => run(() => { if (event.target.value === 'paragraph') editor.chain().focus().setParagraph().run(); else editor.chain().focus().setNode('heading', { level: Number(event.target.value.slice(1)) }).run(); })}><option value="paragraph">{t('Text')}</option>{[1,2,3,4,5,6,7,8,9].map(level => <option key={level} value={`h${level}`}>{t(`Heading ${level}`)}</option>)}</select>
      <span className="docs-toolbar-divider"/><button type="button" className={panel === 'alignment' ? 'active docs-alignment-trigger' : 'docs-alignment-trigger'} aria-label="Text alignment" aria-expanded={panel === 'alignment'} title={t('Text alignment')} onPointerDown={event => event.preventDefault()} onClick={() => run(() => setPanel(value => value === 'alignment' ? null : 'alignment'))}><AlignmentIcon size={17}/><ChevronDown size={13}/></button>
      <span className="docs-toolbar-divider"/>
      {button('Bold', Bold, () => { editor.chain().focus().toggleBold().run(); }, editor.isActive('bold'),'Ctrl/Cmd+B')}
      {button('Italic', Italic, () => { editor.chain().focus().toggleItalic().run(); }, editor.isActive('italic'),'Ctrl/Cmd+I')}
      {button('Underline', Underline, () => { editor.chain().focus().toggleUnderline().run(); }, editor.isActive('underline'),'Ctrl/Cmd+U')}
      {button('Strikethrough', Strikethrough, () => { editor.chain().focus().toggleStrike().run(); }, editor.isActive('strike'))}
      {button('Code', Code2, () => { editor.chain().focus().toggleCode().run(); }, editor.isActive('code'))}
      {button('Highlight', Highlighter, () => { editor.chain().focus().toggleHighlight().run(); }, editor.isActive('highlight'))}
      {button('Text color', Palette, () => setPanel(value => value === 'color' ? null : 'color'), panel === 'color')}
      <span className="docs-toolbar-divider"/>{button('Link', Link2, onLink, editor.isActive('link'),'Ctrl/Cmd+K')}{button('Comment', MessageSquare, onComment)}
      {button('More formatting', MoreHorizontal, () => setPanel(value => value === 'more' ? null : 'more'), panel === 'more')}
      {button('Close formatting toolbar', X, dismiss)}
    </div>
    {panel === 'alignment' && <div className="docs-selection-panel docs-alignment-panel" role="menu" aria-label={t('Text alignment')}>
      {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([alignment, Icon]) => <button key={alignment} type="button" role="menuitemradio" aria-checked={editor.isActive({ textAlign: alignment })} onPointerDown={event => event.preventDefault()} onClick={() => { run(() => editor.chain().focus().setTextAlign(alignment).run()); setPanel(null); }}><Icon size={16}/><span>{t(`Align ${alignment}`)}</span></button>)}
      <div className="docs-toolbar-divider"/>
      <button type="button" role="menuitem" onPointerDown={event => event.preventDefault()} onClick={() => { changeIndent(1); setPanel(null); }}><IndentIncrease size={16}/><span>{t('Increase indent')}</span></button>
      <button type="button" role="menuitem" onPointerDown={event => event.preventDefault()} onClick={() => { changeIndent(-1); setPanel(null); }}><IndentDecrease size={16}/><span>{t('Decrease indent')}</span></button>
    </div>}
    {panel === 'color' && <div className="docs-selection-panel"><strong>{t('Text color')}</strong><div className="docs-color-grid">{colors.map(color => <button key={color} aria-label={`Text color ${color}`} style={{ background: color }} onPointerDown={event => event.preventDefault()} onClick={() => { run(() => { editor.chain().focus().setColor(color).run(); }); setPanel(null); }}/>)}</div>
      <strong>{t('Background color')}</strong><div className="docs-color-grid">{backgrounds.map(color => <button key={color} aria-label={`Background color ${color}`} style={{ background: color }} onPointerDown={event => event.preventDefault()} onClick={() => { run(() => { editor.chain().focus().setBackgroundColor(color).run(); }); setPanel(null); }}/>)}</div>
      <div className="docs-selection-panel-row"><label>{t('Custom color')}<input aria-label="Custom text color" type="color" value={String(editor.getAttributes('textStyle').color || '#1f2329')} onChange={event => run(() => { editor.chain().focus().setColor(event.target.value).run(); })}/></label><button onPointerDown={event => event.preventDefault()} onClick={() => { run(() => { editor.chain().focus().unsetColor().unsetBackgroundColor().unsetHighlight().run(); }); setPanel(null); }}>{t('Reset')}</button></div>
    </div>}
    {panel === 'more' && <div className="docs-selection-panel">
      <div className="docs-selection-panel-row"><select aria-label="Font family" value={editor.getAttributes('textStyle').fontFamily || ''} onChange={event => run(() => { const value = event.target.value; if (value) editor.chain().focus().setFontFamily(value).run(); else editor.chain().focus().unsetFontFamily().run(); })}><option value="">{t('Default font')}</option><option>Arial</option><option>Georgia</option><option>Times New Roman</option><option>Courier New</option></select>
        <select aria-label="Font size" value={editor.getAttributes('textStyle').fontSize || ''} onChange={event => run(() => { if (event.target.value) editor.chain().focus().setFontSize(event.target.value).run(); else editor.chain().focus().unsetFontSize().run(); })}><option value="">{t('Default size')}</option>{[12,14,16,18,20,24,28,32].map(size => <option key={size} value={`${size}px`}>{size}</option>)}</select></div>
      <div className="docs-selection-panel-row">{button('Bullet list',List,()=>{editor.chain().focus().toggleBulletList().run();},editor.isActive('bulletList'))}{button('Numbered list',ListOrdered,()=>{editor.chain().focus().toggleOrderedList().run();},editor.isActive('orderedList'))}{button('Checklist',CheckSquare,()=>{editor.chain().focus().toggleTaskList().run();},editor.isActive('taskList'))}</div>
      <div className="docs-selection-panel-row"><button onClick={()=>run(()=>requestDocs(editor,{action:'block-style'}))}>{t('Block style')}</button><button onClick={()=>run(()=>requestDocs(editor,{action:'template-save'}))}>{t('Save template')}</button><button onClick={()=>run(()=>{editor.chain().focus().unsetBold().unsetItalic().unsetUnderline().unsetStrike().unsetCode().unsetHighlight().unsetColor().unsetBackgroundColor().unsetFontFamily().unsetFontSize().run();})}>{t('Clear format')}</button></div>
    </div>}
  </Anchored>;
}
