import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import type { Action } from "./logic";
import { kindFor } from "./logic";
import { extensions, readLocalDocument, startupIssue } from "./editor";
import { useEditorUX } from "./useEditorUX";
import type { Popup } from "./targets";
import { SelectionToolbar, PopupMenu, DetailPopover } from "./FloatingUI";
import { Gutter } from "./Gutter";
import { DocumentTools } from "./DocumentTools";
import { CommentsPanel } from "./CommentsPanel";
import { anchorComment } from "./comments";
import { insertImageFile } from "./imageFiles";
import { executeAction } from "./handleAction";
import { useDocumentState } from "./useDocumentState";
import { useEditorShortcuts } from "./useEditorShortcuts";
import { downloadText, RECOVERY_KEY } from "./storage";
import { sanitizeHTML } from "./contentIO";
import "./comments.css";
import "./color-tools.css";
import "./image-files.css";
import "./columns.css";
import "./interactions.css";
import "./completion.css";

export default function App() {
  const [initial] = useState(readLocalDocument);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [message, setMessage] = useState("");
  const hoverTimer = useRef<number>(0);
  const editorRef = useRef<Editor | null>(null);
  const editor = useEditor({
    extensions, content: initial, immediatelyRender: false,
    editorProps: {
      attributes: { "aria-label": "Document content", role: "textbox", "aria-multiline": "true" },
      transformPastedHTML: sanitizeHTML,
      handlePaste(_view, event) {
        const file = Array.from(event.clipboardData?.files || []).find(f => f.type.startsWith("image/"));
        const instance = editorRef.current;
        if (!file || !instance) return false;
        event.preventDefault(); void insertImageFile(instance, file).catch(error => setMessage(String(error))); return true;
      },
      handleDrop(view, event) {
        const file = Array.from(event.dataTransfer?.files || []).find(f => f.type.startsWith("image/"));
        const instance = editorRef.current;
        if (!file || !instance) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        void insertImageFile(instance, file, pos).catch(error => setMessage(String(error))); return true;
      },
    },
  });
  editorRef.current = editor;
  const document = useDocumentState(editor, startupIssue);
  const ux = useEditorUX(editor);
  useEditorShortcuts(editor, ux.setPopup);
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);
  const outline = useMemo(() => {
    const entries: { text: string; pos: number; level: number; id: string }[] = [];
    editor?.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading") entries.push({ text: node.textContent, pos, level: node.attrs.level as number, id: String(node.attrs.blockId || pos) });
    });
    return entries;
  }, [editor, document.revision]);
  if (!editor) return <main className="loading">Loading document...</main>;
  const popup = ux.popup;
  const openDetail = (type: "link" | "image" | "comment", source?: Popup) => {
    const selection = editor.state.selection;
    const pos = source?.pos ?? (selection.$from.depth ? selection.$from.before(1) : selection.from);
    const rect = editor.view.coordsAtPos(selection.from);
    ux.setSelectionAnchor(null);
    ux.setPopup({ ...source, type, block: type === "comment" ? "text" : type, pos,
      from: source?.from ?? selection.from, to: source?.to ?? selection.to,
      anchor: source?.anchor || ux.selectionAnchor || { element: null, point: { x: rect.left, y: rect.bottom }, mode: "caret", from: selection.from } });
  };
  const handleAction = (id: Action) => {
    if (!popup) return;
    if (id === "comment") { openDetail("comment", popup); return; }
    if (id === "link-edit") { openDetail("link", popup); return; }
    if (id === "image-edit") { openDetail("image", popup); return; }
    const target = popup; ux.close(false);
    void executeAction(editor, target, id).then(() => {
      setMessage(["copy", "link-copy", "image-copy", "block-link"].includes(id) ? "Copied to clipboard" : "");
    }).catch(error => setMessage(error instanceof Error ? error.message : String(error)));
  };
  const clearHover = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => { if (!ux.dragging.current && !ux.popup) ux.setHover(null); }, 160);
  };
  const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return <main className="app-shell">
    <header className="topbar">
      <div className="breadcrumbs"><span className="crumb">Workspace /</span><strong>{document.title || "Untitled"}</strong><span className="tag">Lab</span></div>
      <div className="top-actions"><span className="save-state"><span className="save-dot"/>{document.status}</span>
        <DocumentTools editor={editor} revision={document.revision} title={document.title} comments={document.comments}
          onTitle={document.setTitle} onComments={document.setComments}/>
        <button aria-label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>↶</button>
        <button aria-label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>↷</button>
        <button aria-label="Open current block actions" onClick={() => {
          const selection = editor.state.selection, pos = selection.$from.depth ? selection.$from.before(1) : selection.from;
          const rect = editor.view.coordsAtPos(selection.from);
          ux.setPopup({ type: "menu", block: kindFor(editor.state.doc.nodeAt(pos)?.type.name || ""), pos,
            anchor: { element: null, point: { x: rect.left, y: rect.bottom }, mode: "caret", from: selection.from } });
        }}>⋮</button>
        <button onClick={() => setOutlineOpen(value => !value)} aria-label="Toggle outline and comments">☷</button>
      </div>
    </header>
    {(document.notice || message) && <div className="document-notice" role={document.notice ? "alert" : "status"}>
      <span>{document.notice || message}</span>
      {document.blocked && <button onClick={document.keepMine}>Keep this copy</button>}
      {document.notice && <button onClick={() => document.flush()}>Retry save</button>}
      {startupIssue && <button onClick={() => {
        try { const raw = localStorage.getItem(RECOVERY_KEY); if (raw) downloadText("document-recovery.json", raw); else setMessage("No recovery file is available."); }
        catch { setMessage("Recovery data cannot be read from browser storage."); }
      }}>Download recovery</button>}
      {!document.notice && <button aria-label="Dismiss notice" onClick={() => setMessage("")}>×</button>}
    </div>}
    <div className="workspace"><section className="page">
      <div className="page-meta">Document · Local editing</div>
      <input className="document-title title-input" aria-label="Document title" maxLength={200} value={document.title}
        onChange={event => document.setTitle(event.target.value)} onBlur={() => { if (!document.title.trim()) document.setTitle("Untitled"); }}/>
      <p className="document-hint">Select text, hover a block, or right-click. Use Shift+F10 for block actions.</p>
      <div className="editor-frame" onMouseMove={event => { clearTimeout(hoverTimer.current); ux.onMouseMove(event); }} onMouseLeave={clearHover}
        onContextMenu={ux.onContextMenu} onClick={ux.onClick} onDragOver={event => {
          if (event.dataTransfer.types.includes("Files")) event.preventDefault();
        }} onPointerUp={() => requestAnimationFrame(ux.trackSelection)}><EditorContent editor={editor}/></div>
      <footer className="page-footer"><span>{words} words · {Array.from(text).length} characters</span><span role="status">{document.status}</span></footer>
    </section>
    {outlineOpen && <aside className="outline-panel"><div className="outline-title">On this page<button aria-label="Close outline" onClick={() => setOutlineOpen(false)}>×</button></div>
      <nav aria-label="Document outline">{outline.map(({ text: label, pos, level, id }) => <button key={id} style={{ paddingLeft: (level - 1) * 12 + 9 }}
        onClick={() => editor.chain().focus().setTextSelection(pos + 1).scrollIntoView().run()}>{label || "Untitled heading"}</button>)}</nav>
      <CommentsPanel editor={editor} comments={document.comments} onUpdate={document.setComments}/>
    </aside>}
    </div>
    <Gutter hover={ux.hover} onInsert={() => { if (ux.hover) ux.openGutter("insert", ux.hover); }}
      onMenu={() => { if (ux.hover) ux.openGutter("menu", ux.hover); }} onPointerDown={ux.onGutterPointerDown}
      onEnter={() => clearTimeout(hoverTimer.current)} onLeave={clearHover}/>
    {ux.indicator && <div className="block-drop-indicator" style={ux.indicator}/>}
    {ux.selectionAnchor && !popup && <SelectionToolbar editor={editor} anchor={ux.selectionAnchor} onLink={() => openDetail("link")} onComment={() => openDetail("comment")}/>}
    {popup && ["menu", "insert", "slash"].includes(popup.type) && <PopupMenu editor={editor} popup={popup} onChoose={handleAction} onClose={() => ux.close(true)}/>}
    {popup && ["link", "image", "comment"].includes(popup.type) && <DetailPopover key={`${popup.type}:${popup.blockId || popup.pos}`} editor={editor} popup={popup} onClose={ux.close}
      onComment={note => {
        const id = crypto.randomUUID(), excerpt = anchorComment(editor, popup, id);
        document.setComments(list => [...list, { id, text: note, excerpt, resolved: false, createdAt: new Date().toISOString(), replies: [] }]);
      }}/>} 
  </main>;
}
