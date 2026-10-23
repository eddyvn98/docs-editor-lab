import { useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { findMatches, isDocument, safeFileName } from "./documentUtils";
import { validateDocument, sanitizeHTML, exportHTML } from "./contentIO";
import { normalizeComments } from "./comments";
import type { Comment } from "./comments";
import { downloadText, writeStorage } from "./storage";
import { searchKey } from "./SearchHighlights";
import "./document-tools.css";

type Version = { id: string; at: string; doc: JSONContent; title?: string; comments?: Comment[] };
const STORE = "docs-editor-lab-versions-v2";
function loadVersions(): Version[] {
  try {
    const values: unknown = JSON.parse(localStorage.getItem(STORE) || localStorage.getItem("docs-editor-lab-versions-v1") || "[]");
    return Array.isArray(values) ? values.filter(v => v && typeof v.id === "string" && isDocument(v.doc)).slice(0, 8) : [];
  } catch { return []; }
}
export function DocumentTools({ editor, revision, title, comments, onTitle, onComments }: {
  editor: Editor; revision: number; title: string; comments: Comment[];
  onTitle: (value: string) => void; onComments: (value: Comment[]) => void;
}) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState(""), [cursor, setCursor] = useState(-1);
  const [versions, setVersions] = useState<Version[]>(loadVersions);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null), fileRef = useRef<HTMLInputElement>(null), findRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => findMatches(editor.state.doc, query), [editor, revision, query]);
  useEffect(() => setCursor(-1), [query]);
  useEffect(() => {
    editor.view.dispatch(editor.state.tr.setMeta(searchKey, { query: open ? query : "", current: cursor }).setMeta("addToHistory", false));
  }, [editor, query, open, cursor]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f" && editor.isFocused) {
        event.preventDefault(); setOpen(true); requestAnimationFrame(() => findRef.current?.focus());
      }
      if (event.key === "Escape" && open) { event.preventDefault(); setOpen(false); editor.view.focus(); }
    };
    const outside = (event: PointerEvent) => { if (open && !ref.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("keydown", key); document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", outside); };
  }, [editor, open]);
  const go = (index: number) => {
    if (!matches.length) return;
    const next = (index + matches.length) % matches.length; setCursor(next);
    editor.chain().setTextSelection(matches[next]).scrollIntoView().run();
  };
  const replace = (all: boolean) => {
    if (!matches.length) return;
    const selected = all ? [...matches].reverse() : [matches[Math.max(0, Math.min(cursor, matches.length - 1))]];
    const tr = editor.state.tr;
    for (const match of selected) tr.insertText(replacement, match.from, match.to);
    if (tr.docChanged) editor.view.dispatch(tr.scrollIntoView());
    setCursor(-1); setMessage(`Replaced ${selected.length} match(es)`);
  };
  const checkpoint = () => {
    const item: Version = { id: crypto.randomUUID(), at: new Date().toLocaleString(), doc: editor.getJSON(), title, comments };
    const next = [item, ...versions].slice(0, 8);
    const result = writeStorage(STORE, next);
    if (!result.ok) throw new Error("Cannot save a recovery checkpoint. Export JSON and free browser storage first.");
    setVersions(next); return item;
  };
  const report = (action: () => void) => { try { action(); } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); } };
  const restore = (version: Version) => report(() => {
    const doc = validateDocument(version.doc, editor);
    if (!window.confirm("Restore this version? The current document will be checkpointed first.")) return;
    checkpoint();
    editor.commands.setContent(doc, { errorOnInvalidContent: true });
    onComments(normalizeComments(version.comments));
    if (typeof version.title === "string") onTitle(version.title);
    setMessage("Version restored");
  });
  const importFile = async (file?: File) => {
    if (!file || busy) return;
    setBusy(true); setMessage("");
    try {
      if (file.size > 8_000_000) throw new Error("Use a file below 8 MB.");
      const raw = await file.text();
      let content: JSONContent | string;
      let importedComments: Comment[] = [], importedTitle = title;
      if (/\.json$/i.test(file.name)) {
        const value: unknown = JSON.parse(raw);
        const envelope = value && typeof value === "object" ? value as Record<string, unknown> : {};
        content = validateDocument(isDocument(value) ? value : envelope.doc, editor);
        importedComments = normalizeComments(envelope.comments);
        if (typeof envelope.title === "string") importedTitle = envelope.title.slice(0, 200);
      } else if (/\.html?$/i.test(file.name)) {
        content = sanitizeHTML(raw);
      } else throw new Error("Supported imports: JSON and HTML.");
      if (!window.confirm("Replace the current document? A recovery checkpoint will be saved first.")) return;
      checkpoint();
      editor.commands.setContent(content, { errorOnInvalidContent: true });
      onComments(importedComments); onTitle(importedTitle); setMessage(`Imported ${file.name}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Import failed"); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  return <div className="document-tools" ref={ref}>
    <button aria-label="Document tools" aria-expanded={open} onClick={() => setOpen(value => !value)}>Tools ▾</button>
    {open && <section className="tools-panel" aria-label="Document tools panel">
      <header><strong>Find & replace</strong><button aria-label="Close tools" onClick={() => setOpen(false)}>×</button></header>
      <input ref={findRef} aria-label="Find text" placeholder="Find in document..." value={query} onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); go(cursor + (e.shiftKey ? -1 : 1)); } }}/>
      <div className="tools-row"><small>{cursor >= 0 && matches.length ? `${Math.min(cursor + 1, matches.length)} / ` : ""}{matches.length} matches</small>
        <button aria-label="Previous match" disabled={!matches.length} onClick={() => go(cursor < 0 ? matches.length - 1 : cursor - 1)}>↑</button>
        <button aria-label="Next match" disabled={!matches.length} onClick={() => go(cursor + 1)}>↓</button></div>
      <input aria-label="Replace with" placeholder="Replace with..." value={replacement} onChange={e => setReplacement(e.target.value)}/>
      <div className="tools-row"><button disabled={!matches.length} onClick={() => replace(false)}>Replace</button>
        <button disabled={!matches.length} onClick={() => replace(true)}>Replace all</button></div>
      <hr/><strong>Import & export</strong>
      <div className="tools-row wrap">
        <button onClick={() => downloadText(`${safeFileName(title)}.html`, exportHTML(editor, title), "text/html")}>HTML</button>
        <button onClick={() => downloadText(`${safeFileName(title)}.json`, JSON.stringify({ version: 2, doc: editor.getJSON(), title, comments }, null, 2))}>JSON</button>
        <button onClick={() => downloadText(`${safeFileName(title)}-document.json`, JSON.stringify(editor.getJSON(), null, 2))}>Document JSON</button>
        <button onClick={() => window.print()}>Print / PDF</button>
        <button disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? "Importing..." : "Import..."}</button>
      </div>
      <small>JSON includes local comment threads. Document JSON exports only TipTap content.</small>
      <input ref={fileRef} type="file" hidden accept=".json,.html,.htm" onChange={e => { void importFile(e.target.files?.[0]); }}/>
      <hr/><div className="tools-row"><strong>Local versions</strong><button onClick={() => report(() => { checkpoint(); setMessage("Version saved"); })}>Save version</button></div>
      {!versions.length && <small>No saved versions yet</small>}
      <div className="version-list">{versions.map(version => <div key={version.id} className="version">
        <small>{version.at || "Older checkpoint"}</small><button onClick={() => restore(version)}>Restore</button>
        <button aria-label="Delete version" onClick={() => report(() => {
          const next = versions.filter(v => v.id !== version.id);
          const result = writeStorage(STORE, next); if (!result.ok) throw new Error(result.error); setVersions(next);
        })}>×</button></div>)}</div>
      {message && <p className="tools-message" role="status">{message}</p>}
    </section>}
  </div>;
}
