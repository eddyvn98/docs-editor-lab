import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouse } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import type { Action } from './logic';
import { kindFor } from './logic';
import { extensions, readLocalDocument, startupIssue } from './editor';
import { useEditorUX } from './useEditorUX';
import { blockFromDOM } from './targets';
import type { Popup } from './targets';
import { SelectionToolbar, PopupMenu, DetailPopover } from './FloatingUI';
import { Gutter } from './Gutter';
import { DocumentTools } from './DocumentTools';
import { CommentsPanel } from './CommentsPanel';
import { anchorComment } from './comments';
import { insertImageFile } from './imageFiles';
import { executeAction } from './handleAction';
import { useDocumentState } from './useDocumentState';
import { useEditorShortcuts } from './useEditorShortcuts';
import { downloadText, RECOVERY_KEY } from './storage';
import { sanitizeHTML } from './contentIO';
import { safeLink } from './safety';
import { positionById } from './BlockIdentity';
import { goToHeading } from './HeadingFolding';
import { useViewPreferences } from './useViewPreferences';
import { FormatBar } from './FormatBar';
import { TableToolbar } from './TableToolbar';
import { WorkspaceOutline } from './WorkspaceOutline';
import { ViewControls } from './ViewControls';
import { ShortcutHelp } from './ShortcutHelp';
import { InsertPalette } from './InsertPalette';
import { ImageLightbox } from './ImageLightbox';
import './comments.css';
import './color-tools.css';
import './image-files.css';
import './columns.css';
import './interactions.css';
import './completion.css';
import './workspace-polish.css';

export default function App() {
  const [initial] = useState(readLocalDocument);
  const [outlineOpen, setOutlineOpen] = useState(true), [tab, setTab] = useState<'outline' | 'comments'>('outline');
  const [message, setMessage] = useState(''), [help, setHelp] = useState(false), [insert, setInsert] = useState(false);
  const [imagePosition, setImagePosition] = useState<number | null>(null);
  const hoverTimer = useRef<number>(0), editorRef = useRef<Editor | null>(null);
  const editor = useEditor({
    extensions, content: initial, immediatelyRender: false,
    editorProps: {
      attributes: { 'aria-label': 'Document content', role: 'textbox', 'aria-multiline': 'true' },
      transformPastedHTML: sanitizeHTML,
      handlePaste(_view, event) {
        const file = Array.from(event.clipboardData?.files || []).find(f => f.type.startsWith('image/'));
        const instance = editorRef.current;
        if (!file || !instance) return false;
        event.preventDefault();
        if (instance.isEditable) void insertImageFile(instance, file).catch(error => setMessage(String(error)));
        return true;
      },
      handleDrop(view, event) {
        const file = Array.from(event.dataTransfer?.files || []).find(f => f.type.startsWith('image/'));
        const instance = editorRef.current;
        if (!file || !instance) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        if (instance.isEditable) void insertImageFile(instance, file, pos).catch(error => setMessage(String(error)));
        return true;
      },
    },
  });
  editorRef.current = editor;
  const docState = useDocumentState(editor, startupIssue);
  const { view, patchView } = useViewPreferences(editor), readOnly = view.mode === 'read';
  const ux = useEditorUX(readOnly ? null : editor);
  useEditorShortcuts(readOnly ? null : editor, ux.setPopup);
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);
  useEffect(() => {
    ux.close(false); setInsert(false);
    editor?.view.dom.setAttribute('aria-readonly', String(readOnly));
  }, [readOnly, editor, ux.close]);
  useEffect(() => {
    if (!editor) return;
    const keys = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || !editor.isFocused || !(event.ctrlKey || event.metaKey)) return;
      if (event.key === '/') { event.preventDefault(); ux.close(false); setHelp(true); }
      if (!readOnly && event.shiftKey && event.key.toLowerCase() === 'p') { event.preventDefault(); ux.close(false); setInsert(true); }
    };
    document.addEventListener('keydown', keys); return () => document.removeEventListener('keydown', keys);
  }, [editor, readOnly, ux.close]);
  if (!editor) return <main className="loading">Loading document...</main>;
  const popup = ux.popup;
  const openDetail = (type: 'link' | 'image' | 'comment', source?: Popup) => {
    if (readOnly) return;
    const selection = editor.state.selection;
    const pos = source?.pos ?? (selection.$from.depth ? selection.$from.before(1) : selection.from);
    const rect = editor.view.coordsAtPos(selection.from);
    ux.setSelectionAnchor(null);
    ux.setPopup({ ...source, type, block: type === 'comment' ? 'text' : type, pos,
      from: source?.from ?? selection.from, to: source?.to ?? selection.to,
      anchor: source?.anchor || ux.selectionAnchor || { element: null, point: { x: rect.left, y: rect.bottom }, mode: 'caret', from: selection.from } });
  };
  const handleAction = (id: Action) => {
    if (!popup || readOnly) return;
    if (id === 'comment') { openDetail('comment', popup); return; }
    if (id === 'link-edit') { openDetail('link', popup); return; }
    if (id === 'image-edit') { openDetail('image', popup); return; }
    const target = popup; ux.close(false);
    void executeAction(editor, target, id).then(() => {
      setMessage(['copy', 'link-copy', 'image-copy', 'block-link'].includes(id) ? 'Copied to clipboard' : '');
    }).catch(error => setMessage(error instanceof Error ? error.message : String(error)));
  };
  const clearHover = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => { if (!ux.dragging.current && !ux.popup) ux.setHover(null); }, 160);
  };
  const showImage = (event: ReactMouse<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest('button,input')) return false;
    const target = event.target instanceof Element ? event.target.closest('.image-figure') : null;
    const found = target && blockFromDOM(editor, target, true);
    if (found) { event.preventDefault(); ux.close(false); setImagePosition(found.pos); return true; }
    return false;
  };
  const contentClick = (event: ReactMouse<HTMLDivElement>) => {
    if (!readOnly) { ux.onClick(event); return; }
    if (showImage(event)) return;
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (link) {
      event.preventDefault(); const href = safeLink(link.getAttribute('href') || '');
      if (href?.startsWith('#block-')) { const pos = positionById(editor, href.slice(7)); if (pos !== null) goToHeading(editor, pos); }
      else if (href) window.open(href, '_blank', 'noopener,noreferrer');
    }
  };
  const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return <main className={`app-shell ${readOnly ? 'is-reading' : ''} ${view.focus ? 'is-focused' : ''}`}
    data-theme={view.theme} data-width={view.width} data-font={view.font} style={{ '--reading-size': `${view.size}px` } as CSSProperties}>
    <header className="topbar">
      <div className="breadcrumbs"><span className="crumb">Workspace /</span><strong>{docState.title || 'Untitled'}</strong><span className="tag">Lab</span></div>
      <div className="top-actions"><span className="save-state"><span className="save-dot"/>{docState.status}</span>
        {!readOnly && <><DocumentTools editor={editor} revision={docState.revision} title={docState.title} comments={docState.comments}
          onTitle={docState.setTitle} onComments={docState.setComments}/>
          <button aria-label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>&#8630;</button>
          <button aria-label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>&#8631;</button>
          <button aria-label="Open current block actions" onClick={() => {
            const selection = editor.state.selection, pos = selection.$from.depth ? selection.$from.before(1) : selection.from;
            const rect = editor.view.coordsAtPos(selection.from);
            ux.setPopup({ type: 'menu', block: kindFor(editor.state.doc.nodeAt(pos)?.type.name || ''), pos,
              anchor: { element: null, point: { x: rect.left, y: rect.bottom }, mode: 'caret', from: selection.from } });
          }}>&#8942;</button></>}
        {readOnly && <button onClick={() => patchView({ mode: 'edit' })}>Edit</button>}
        {view.focus && <button className="focus-exit" onClick={() => patchView({ focus: false })}>Exit focus</button>}
        <ViewControls view={view} onChange={patchView} onHelp={() => setHelp(true)}/>
        <button onClick={() => { patchView({ focus: false }); setOutlineOpen(value => !value); }} aria-label="Toggle outline and comments">&#9776;</button>
      </div>
    </header>
    <FormatBar editor={editor} readOnly={readOnly} onInsert={() => { ux.close(false); setInsert(true); }} onLink={() => openDetail('link')} onComment={() => openDetail('comment')} onHelp={() => setHelp(true)}/>
    <TableToolbar editor={editor} readOnly={readOnly}/>
    {(docState.notice || message) && <div className="document-notice" role={docState.notice ? 'alert' : 'status'}>
      <span>{docState.notice || message}</span>
      {docState.blocked && <button onClick={docState.keepMine}>Keep this copy</button>}
      {docState.notice && <button onClick={() => docState.flush()}>Retry save</button>}
      {startupIssue && <button onClick={() => {
        try { const raw = localStorage.getItem(RECOVERY_KEY); if (raw) downloadText('document-recovery.json', raw); else setMessage('No recovery file is available.'); }
        catch { setMessage('Recovery data cannot be read from browser storage.'); }
      }}>Download recovery</button>}
      {!docState.notice && <button aria-label="Dismiss notice" onClick={() => setMessage('')}>&times;</button>}
    </div>}
    <div className="workspace"><section className="page">
      <div className="page-meta">Document &middot; {readOnly ? 'Reading' : 'Local editing'}</div>
      <input className="document-title title-input" aria-label="Document title" readOnly={readOnly} maxLength={200} value={docState.title}
        onChange={event => docState.setTitle(event.target.value)} onBlur={() => { if (!readOnly && !docState.title.trim()) docState.setTitle('Untitled'); }}/>
      <p className="document-hint">{readOnly ? 'Select text to copy. Click an image to enlarge it.' : 'Select text or right-click a block. Ctrl/Cmd+Shift+P inserts content. Double-click images to enlarge.'}</p>
      <div className="editor-frame" onMouseMove={event => { if (!readOnly) { clearTimeout(hoverTimer.current); ux.onMouseMove(event); } }} onMouseLeave={clearHover}
        onContextMenu={event => { if (!readOnly) ux.onContextMenu(event); }} onClick={contentClick} onDoubleClick={event => { showImage(event); }}
        onDragOver={event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
        onPointerUp={() => { if (!readOnly) requestAnimationFrame(ux.trackSelection); }}><EditorContent editor={editor}/></div>
      <footer className="page-footer"><span>{words} words &middot; {Array.from(text).length} characters</span><span role="status">{docState.status}</span></footer>
    </section>
    {outlineOpen && !view.focus && <aside className="outline-panel" aria-label="Document navigation">
      <div className="sidebar-tabs" role="tablist" aria-label="Sidebar panels" onKeyDown={event => {
        if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
          event.preventDefault(); const next = tab === 'outline' ? 'comments' : 'outline'; setTab(next);
          event.currentTarget.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)?.focus();
        }
      }}>
        <button role="tab" data-tab="outline" id="outline-tab" aria-controls="outline-panel" aria-selected={tab === 'outline'} tabIndex={tab === 'outline' ? 0 : -1} onClick={() => setTab('outline')}>Outline</button>
        <button role="tab" data-tab="comments" id="comments-tab" aria-controls="comments-panel" aria-selected={tab === 'comments'} tabIndex={tab === 'comments' ? 0 : -1} onClick={() => setTab('comments')}>Comments ({docState.comments.filter(c => !c.resolved).length})</button>
        <button className="close-sidebar" aria-label="Close outline" onClick={() => setOutlineOpen(false)}>&times;</button>
      </div>
      <div role="tabpanel" id="outline-panel" aria-labelledby="outline-tab" hidden={tab !== 'outline'}><WorkspaceOutline editor={editor}/></div>
      <div role="tabpanel" id="comments-panel" aria-labelledby="comments-tab" hidden={tab !== 'comments'}>
        <CommentsPanel editor={editor} comments={docState.comments} onUpdate={docState.setComments} readOnly={readOnly}/>
      </div>
    </aside>}
    </div>
    {!readOnly && <Gutter hover={ux.hover} onInsert={() => { if (ux.hover) ux.openGutter('insert', ux.hover); }} onMenu={() => { if (ux.hover) ux.openGutter('menu', ux.hover); }}
      onPointerDown={ux.onGutterPointerDown} onEnter={() => clearTimeout(hoverTimer.current)} onLeave={clearHover}/>}
    {!readOnly && ux.indicator && <div className="block-drop-indicator" style={ux.indicator}/>}
    {!readOnly && ux.selectionAnchor && !popup && !insert && !help && <SelectionToolbar editor={editor} anchor={ux.selectionAnchor} onLink={() => openDetail('link')} onComment={() => openDetail('comment')}/>}
    {!readOnly && popup && ['menu', 'insert', 'slash'].includes(popup.type) && <PopupMenu editor={editor} popup={popup} onChoose={handleAction} onClose={() => ux.close(true)}/>}
    {!readOnly && popup && ['link', 'image', 'comment'].includes(popup.type) && <DetailPopover key={`${popup.type}:${popup.blockId || popup.pos}`} editor={editor} popup={popup} onClose={ux.close}
      onComment={note => {
        const id = crypto.randomUUID(), excerpt = anchorComment(editor, popup, id);
        docState.setComments(list => [...list, { id, text: note, excerpt, resolved: false, createdAt: new Date().toISOString(), replies: [] }]);
        setTab('comments'); setOutlineOpen(true); patchView({ focus: false });
      }}/>} 
    {insert && !readOnly && <InsertPalette editor={editor} onClose={() => setInsert(false)}/>}
    {help && <ShortcutHelp onClose={() => setHelp(false)}/>}
    {imagePosition !== null && <ImageLightbox editor={editor} position={imagePosition} onClose={() => setImagePosition(null)}/>}
  </main>;
}
