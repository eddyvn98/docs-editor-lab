import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { readComments } from "./comments";
import type { Comment } from "./comments";
import { readSession, saveSession, SESSION_KEY } from "./session";

export function useDocumentState(editor: Editor | null, startupError = "") {
  const [comments, setComments] = useState<Comment[]>(readComments);
  const [title, setTitle] = useState(() => {
    const value = readSession().title;
    return typeof value === "string" && value.trim() ? value.slice(0, 200) : "Product planning notes";
  });
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState("Ready");
  const [notice, setNotice] = useState(startupError);
  const [blocked, setBlocked] = useState(Boolean(startupError));
  const dirty = useRef(false);
  const data = useRef({ comments, title, blocked });
  data.current = { comments, title, blocked };
  const flush = useCallback(() => {
    if (!editor || editor.isDestroyed || !dirty.current || data.current.blocked) return;
    const result = saveSession(editor.getJSON(), data.current.comments, data.current.title);
    if (result.ok) { dirty.current = false; setStatus("Saved locally"); setNotice(""); }
    else { setStatus("Not saved"); setNotice(result.error); }
  }, [editor]);
  useEffect(() => {
    if (!editor) return;
    const changed = () => { dirty.current = true; setStatus(data.current.blocked ? "Not saved" : "Saving..."); setRevision(v => v + 1); };
    const crossTab = (event: StorageEvent) => {
      if (event.key !== SESSION_KEY) return;
      // Pause immediately, not just after React's next render.
      data.current.blocked = true;
      setBlocked(true); setStatus("Conflict");
      setNotice("Another tab changed this document. Export your copy before reloading, or explicitly keep this tab's version.");
    };
    const leave = (event: BeforeUnloadEvent) => {
      flush();
      if (dirty.current || data.current.blocked) { event.preventDefault(); event.returnValue = ""; }
    };
    editor.on("update", changed);
    window.addEventListener("storage", crossTab);
    window.addEventListener("beforeunload", leave);
    window.addEventListener("pagehide", flush);
    return () => {
      editor.off("update", changed); window.removeEventListener("storage", crossTab);
      window.removeEventListener("beforeunload", leave); window.removeEventListener("pagehide", flush);
    };
  }, [editor, flush]);
  useEffect(() => {
    if (!editor) return;
    dirty.current = true;
    if (!blocked) setStatus("Saving...");
    const timer = window.setTimeout(flush, 350);
    return () => window.clearTimeout(timer);
  }, [editor, revision, comments, title, blocked, flush]);
  const keepMine = () => {
    if (!window.confirm("Replace the stored document with the current tab's copy? Export first to preserve both.")) return;
    data.current.blocked = false; setBlocked(false); dirty.current = true; setNotice(""); flush();
  };
  return { comments, setComments, title, setTitle, revision, status, notice, setNotice, blocked, keepMine, flush };
}
