import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouse } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import type { Action } from './logic';
import { extensions, readLocalDocument, startupIssue } from './editor';
import { useEditorUX } from './useEditorUX';
import { blockFromDOM } from './targets';
import type { Popup } from './targets';
import { SelectionToolbar, PopupMenu, DetailPopover } from './FloatingUI';
import { Gutter } from './Gutter';
import { anchorComment } from './comments';
import { insertImageFile } from './imageFiles';
import { executeAction } from './handleAction';
import { useDocumentState } from './useDocumentState';
import { useEditorShortcuts } from './useEditorShortcuts';
import { handleEditorTab } from './docs-content/handleEditorTab';
import { handlePageBreakEditing } from './docs-content/handlePageBreakEditing';
import { downloadText, RECOVERY_KEY } from './storage';
import { sanitizeHTML } from './contentIO';
import { safeLink } from './safety';
import { positionById } from './BlockIdentity';
import { goToHeading } from './HeadingFolding';
import { useViewPreferences } from './useViewPreferences';
import { ShortcutHelp } from './ShortcutHelp';
import { InsertPalette } from './InsertPalette';
import { ImageLightbox } from './ImageLightbox';
import { TemplateGallery } from './features/TemplateGallery';
import { DocsShell } from './docs-ui/DocsShell';
import { useBlockMarquee } from './docs-ui/useBlockMarquee';
import { BlockRangeSelection } from './docs-ui/blockSelection';
import { imageSourceKey, normalizeImageAnchor, setEditorComments } from './docs-content/imageCommentModel';
import './comments.css';
import './color-tools.css';
import './image-files.css';
import './columns.css';
import './interactions.css';
import './completion.css';
import './workspace-polish.css';
import './features/features.css';
import './docs-blocks.css';
import './docs-ui/docs-shell.css';
import './docs-ui/docs-popovers.css';
import './docs-ui/docs-content.css';
import './docs-ui/docs-rich-content.css';
import './docs-ui/docs-review.css';
import './docs-ui/docs-menus.css';
import './docs-ui/docs-operations.css';
import './docs-ui/docs-visual-polish.css';

export default function App() {
  const [initial] = useState(readLocalDocument);
  const [outlineOpen, setOutlineOpen] = useState(() => window.innerWidth >= 1100), [commentsOpen, setCommentsOpen] = useState(false);
  const [message, setMessage] = useState(''), [help, setHelp] = useState(false), [insert, setInsert] = useState(false);
  const [templates, setTemplates] = useState(false), [imagePosition, setImagePosition] = useState<number | null>(null);
  const hoverTimer = useRef(0), editorRef = useRef<Editor | null>(null), frame = useRef<HTMLDivElement>(null);
  const editor = useEditor({
    extensions, content: initial, immediatelyRender: false,
    editorProps: {
      attributes: { 'aria-label': 'Document content', role: 'textbox', 'aria-multiline': 'true' },
      transformPastedHTML: sanitizeHTML,
      handleKeyDown(view, event) {
        const instance = editorRef.current;
        if (instance?.isEditable) return handlePageBreakEditing(view, event) || handleEditorTab(instance, event);
        if (instance?.isEditable !== false) return false;
        if ((event.ctrlKey || event.metaKey) && ['b','i','u','z','y','k','d','m','v','x'].includes(event.key.toLowerCase())) { event.preventDefault(); return true; }
        return false;
      },
      handlePaste(_view, event) {
        const instance = editorRef.current;
        if (instance && !instance.isEditable) { event.preventDefault(); return true; }
        const file = Array.from(event.clipboardData?.files || []).find(item => item.type.startsWith('image/'));
        if (!file || !instance) return false;
        event.preventDefault(); void insertImageFile(instance, file).catch(error => setMessage(String(error))); return true;
      },
      handleDrop(view, event) {
        const instance = editorRef.current;
        if (instance && !instance.isEditable) { event.preventDefault(); return true; }
        const file = Array.from(event.dataTransfer?.files || []).find(item => item.type.startsWith('image/'));
        if (!file || !instance) return false;
        event.preventDefault(); const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        void insertImageFile(instance, file, pos).catch(error => setMessage(String(error))); return true;
      },
    },
  });
  editorRef.current = editor;
  const docState = useDocumentState(editor, startupIssue);
  const { view, patchView } = useViewPreferences(editor), readOnly = view.mode === 'read';
  const ux = useEditorUX(readOnly ? null : editor);
  useEditorShortcuts(readOnly ? null : editor, ux.setPopup);
  useBlockMarquee(editor, frame, readOnly);
  useEffect(() => {
    const open = () => { if (editorRef.current?.isEditable) { ux.close(false); setTemplates(true); } };
    window.addEventListener('docs-open-template-gallery', open);
    return () => window.removeEventListener('docs-open-template-gallery', open);
  }, [ux.close]);
  useEffect(() => () => clearTimeout(hoverTimer.current), []);
  useEffect(() => {
    ux.close(false); setInsert(false); setTemplates(false); setImagePosition(null);
    editor?.view.dom.setAttribute('aria-readonly', String(readOnly));
  }, [readOnly, editor, ux.close]);
  useEffect(() => { if (editor) setEditorComments(editor, docState.comments); }, [editor, docState.comments]);
  useEffect(() => {
    if (!editor) return;
    const openComments = () => { setCommentsOpen(true); if (window.innerWidth <= 1000) setOutlineOpen(false); patchView({ focus: false }); };
    const addImageComment = (event: Event) => {
      const detail = (event as CustomEvent).detail as { text?: unknown; image?: unknown } | null;
      if (!editor.isEditable || !detail || typeof detail.text !== 'string' || !detail.text.trim()) return;
      const image = normalizeImageAnchor(detail.image); if (!image) return;
      const pos = positionById(editor, image.blockId), node = pos === null ? null : editor.state.doc.nodeAt(pos);
      if (node?.type.name !== 'image' || imageSourceKey(String(node.attrs.src || '')) !== image.sourceKey) { setMessage('The image changed. Select its region again.'); return; }
      docState.setComments(list => [...list, { id: crypto.randomUUID(), text: detail.text!.toString().trim().slice(0, 10000), excerpt: String(node.attrs.caption || node.attrs.alt || 'Image'), image, resolved: false, createdAt: new Date().toISOString(), replies: [] }]);
      openComments();
    };
    editor.view.dom.addEventListener('docs-open-comment', openComments);
    editor.view.dom.addEventListener('docs-add-image-comment', addImageComment);
    return () => { editor.view.dom.removeEventListener('docs-open-comment', openComments); editor.view.dom.removeEventListener('docs-add-image-comment', addImageComment); };
  }, [editor, docState.setComments, patchView]);
  useEffect(() => {
    if (!editor) return;
    const keys = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || !editor.isFocused || !(event.ctrlKey || event.metaKey)) return;
      if (event.key === '/') { event.preventDefault(); ux.close(false); setHelp(true); }
      if (!readOnly && event.shiftKey && event.key.toLowerCase() === 'p') { event.preventDefault(); ux.close(false); setInsert(true); }
    };
    document.addEventListener('keydown', keys); return () => document.removeEventListener('keydown', keys);
  }, [editor, readOnly, ux.close]);
  if (!editor) return <main className="loading" role="status">Loading document...</main>;
  const popup = ux.popup;
  const openDetail = (type: 'link' | 'image' | 'comment', source?: Popup) => {
    if (readOnly) return;
    const selection = editor.state.selection, pos = source?.pos ?? (selection.$from.depth ? selection.$from.before(1) : selection.from);
    const node = editor.state.doc.nodeAt(pos);
    if (type === 'comment' && node?.type.name === 'image') { editor.view.dom.dispatchEvent(new CustomEvent('docs-start-image-comment', { detail: node.attrs.blockId })); return; }
    const rect = editor.view.coordsAtPos(selection.from); ux.setSelectionAnchor(null);
    ux.setPopup({ ...source, type, block: type === 'comment' ? 'text' : type, pos, from: source?.from ?? selection.from, to: source?.to ?? selection.to,
      anchor: source?.anchor || ux.selectionAnchor || { element: null, point: { x: rect.left, y: rect.bottom }, mode: 'caret', from: selection.from } });
  };
  const handleAction = (id: Action, size?: { rows: number; columns: number }) => {
    if (!popup || readOnly) return;
    if (id === 'comment') { openDetail('comment', popup); return; }
    if (id === 'link-edit') { openDetail('link', popup); return; }
    if (id === 'image-edit') { openDetail('image', popup); return; }
    if (id === 'image-preview') { const pos = popup.pos; ux.close(false); setImagePosition(pos); return; }
    const target = popup; ux.close(false);
    void executeAction(editor, target, id, size).then(() => setMessage(['copy','link-copy','image-copy','block-link'].includes(id) ? 'Copied to clipboard' : '')).catch(error => setMessage(error instanceof Error ? error.message : String(error)));
  };
  const clearHover = () => { clearTimeout(hoverTimer.current); hoverTimer.current = window.setTimeout(() => { if (!ux.dragging.current && !ux.popup) ux.setHover(null); }, 160); };
  const showImage = (event: ReactMouse<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest('button,input,textarea,[data-node-controls]')) return false;
    const target = event.target instanceof Element ? event.target.closest('.image-figure') : null, found = target && blockFromDOM(editor, target, true);
    if (found) { event.preventDefault(); ux.close(false); setImagePosition(found.pos); return true; } return false;
  };
  const contentClick = (event: ReactMouse<HTMLDivElement>) => {
    if (!readOnly) { if (!(editor.state.selection instanceof BlockRangeSelection)) ux.onClick(event); return; }
    if (showImage(event)) return;
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (link && !link.closest('[data-node-controls]')) {
      event.preventDefault(); const href = safeLink(link.getAttribute('href') || '');
      if (href?.startsWith('#block-')) { const pos = positionById(editor, href.slice(7)); if (pos !== null) goToHeading(editor, pos); }
      else if (href) window.open(href, '_blank', 'noopener,noreferrer');
    }
  };
  const notice = (docState.notice || message) && <div className="document-notice" role={docState.notice ? 'alert' : 'status'}><span>{docState.notice || message}</span>
    {docState.blocked && <button onClick={docState.keepMine}>Keep this copy</button>}{docState.notice && <button onClick={() => docState.flush()}>Retry save</button>}
    {startupIssue && <button onClick={() => { try { const raw = localStorage.getItem(RECOVERY_KEY); if (raw) downloadText('document-recovery.json', raw); else setMessage('No recovery file is available.'); } catch { setMessage('Recovery data cannot be read from browser storage.'); } }}>Download recovery</button>}
    {!docState.notice && <button aria-label="Dismiss notice" onClick={() => setMessage('')}>&times;</button>}</div>;
  const floating = <>
    {!readOnly && !templates && imagePosition === null && <Gutter hover={ux.hover} onInsert={() => { if (ux.hover) ux.openGutter('insert', ux.hover); }}
      onMenu={() => { if (ux.hover && !(editor.state.selection instanceof BlockRangeSelection)) ux.openGutter('menu', ux.hover); }} onPointerDown={ux.onGutterPointerDown} onEnter={() => clearTimeout(hoverTimer.current)} onLeave={clearHover}/>}
    {!readOnly && ux.indicator && <div className="block-drop-indicator" style={ux.indicator}/>}
    {!readOnly && ux.selectionAnchor && !popup && !insert && !help && !templates && imagePosition === null && <SelectionToolbar editor={editor} anchor={ux.selectionAnchor} onLink={() => openDetail('link')} onComment={() => openDetail('comment')}/>}
    {!readOnly && popup && ['menu','insert','slash'].includes(popup.type) && <PopupMenu editor={editor} popup={popup} onChoose={handleAction} onClose={() => ux.close(true)}/>}
    {!readOnly && popup && ['link','image','comment'].includes(popup.type) && <DetailPopover key={`${popup.type}:${popup.blockId || popup.pos}`} editor={editor} popup={popup} onClose={ux.close} onComment={note => {
      const id = crypto.randomUUID(), excerpt = anchorComment(editor, popup, id);
      docState.setComments(list => [...list, { id, text: note, excerpt, resolved: false, createdAt: new Date().toISOString(), replies: [] }]); setCommentsOpen(true); if (window.innerWidth <= 1000) setOutlineOpen(false); editor.view.dom.dispatchEvent(new CustomEvent('docs-open-comment', { detail: id })); patchView({ focus: false });
    }}/>}
    {insert && !readOnly && <InsertPalette editor={editor} onClose={() => setInsert(false)}/>}{templates && !readOnly && <TemplateGallery editor={editor} onClose={() => setTemplates(false)}/>}
    {help && <ShortcutHelp onClose={() => setHelp(false)}/>}{imagePosition !== null && <ImageLightbox editor={editor} position={imagePosition} onClose={() => setImagePosition(null)}/>}
  </>;
  return <DocsShell editor={editor} state={docState} view={view} patchView={patchView} outlineOpen={outlineOpen} onOutline={() => { patchView({ focus: false }); setOutlineOpen(!outlineOpen); if (!outlineOpen && window.innerWidth <= 1000) setCommentsOpen(false); }}
    commentsOpen={commentsOpen} onComments={() => { patchView({ focus: false }); setCommentsOpen(!commentsOpen); if (!commentsOpen && window.innerWidth <= 1000) setOutlineOpen(false); }} onInsert={() => { ux.close(false); setInsert(true); }} onTemplates={() => { ux.close(false); setTemplates(true); }}
    onHelp={() => setHelp(true)} onComment={() => openDetail('comment')} notice={notice} floating={floating}>
    <div ref={frame} className="editor-frame" onMouseMove={event => { if (!readOnly) { clearTimeout(hoverTimer.current); ux.onMouseMove(event); } }} onMouseLeave={clearHover}
      onContextMenu={event => { if (readOnly) return; if (editor.state.selection instanceof BlockRangeSelection) { event.preventDefault(); ux.close(false); editor.view.dom.dispatchEvent(new CustomEvent('docs-batch-context', { detail: { x: event.clientX, y: event.clientY } })); } else ux.onContextMenu(event); }} onClick={contentClick} onDoubleClick={event => { showImage(event); }}
      onDragOver={event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }} onPointerUp={() => { if (!readOnly) requestAnimationFrame(ux.trackSelection); }}><EditorContent editor={editor}/></div>
  </DocsShell>;
}
