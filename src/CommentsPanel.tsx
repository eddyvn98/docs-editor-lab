import { useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Comment } from "./comments";
import { jumpToComment, removeCommentMark, commentRanges } from "./comments";

export function CommentsPanel({ editor, comments, onUpdate }: {
  editor: Editor; comments: Comment[]; onUpdate: (values: Comment[]) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [showResolved, setShowResolved] = useState(false);
  const [message, setMessage] = useState("");
  const update = (id: string, change: Partial<Comment>) => onUpdate(comments.map(c => c.id === id ? { ...c, ...change } : c));
  return <section className="comments" aria-label="Document comments">
    <strong>Comments · {comments.filter(c => !c.resolved).length} open</strong>
    <label><input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)}/> Show resolved</label>
    {!comments.length && <p>Select text and choose Comment to start a thread.</p>}
    {comments.filter(c => showResolved || !c.resolved).map(c => <article key={c.id} className={c.resolved ? "resolved" : ""}>
      <button className="comment-reference" onClick={() => {
        if (!jumpToComment(editor, c.id)) setMessage("The referenced text was removed. The comment is retained.");
      }}>{c.excerpt || "Document text"}</button>
      {!commentRanges(editor, c.id).length && <small>Detached from deleted text</small>}
      <p>{c.text}</p>
      {c.replies?.map(reply => <p className="comment-reply" key={reply.id}>{reply.text}</p>)}
      {!c.resolved && <form onSubmit={e => {
        e.preventDefault(); const text = drafts[c.id]?.trim(); if (!text) return;
        update(c.id, { replies: [...(c.replies || []), { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() }] });
        setDrafts(d => ({ ...d, [c.id]: "" }));
      }}>
        <input aria-label="Reply to comment" maxLength={10000} placeholder="Reply..." value={drafts[c.id] || ""}
          onChange={e => setDrafts(d => ({ ...d, [c.id]: e.target.value }))}/>
        <button disabled={!drafts[c.id]?.trim()}>Reply</button>
      </form>}
      <div className="comment-controls">
        <button onClick={() => update(c.id, { resolved: !c.resolved })}>{c.resolved ? "Reopen" : "Resolve"}</button>
        <button aria-label="Delete comment" onClick={() => {
          removeCommentMark(editor, c.id); onUpdate(comments.filter(x => x.id !== c.id));
        }}>Delete</button>
      </div>
    </article>)}
    {message && <p role="status">{message}</p>}
  </section>;
}
