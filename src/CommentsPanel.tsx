import type {Editor} from "@tiptap/react";
import type {Comment} from "./comments";
import {jumpToComment} from "./comments";
export function CommentsPanel({editor,comments,onUpdate}:{editor:Editor;comments:Comment[];onUpdate:(values:Comment[])=>void}){
  if(!comments.length)return <div className="outline-help">No comments yet · select text and choose Comment.</div>;
  return <section className="comments" aria-label="Document comments">
    <strong>Comments · {comments.filter(c=>!c.resolved).length} open</strong>
    {comments.map(c=><article key={c.id} className={c.resolved?"resolved":""}>
      <button className="comment-reference" onClick={()=>jumpToComment(editor,c.id)} title="Jump to highlighted text">{c.excerpt||"Document block"}</button>
      <p>{c.text}</p><div className="comment-controls">
        <button onClick={()=>onUpdate(comments.map(x=>x.id===c.id?{...x,resolved:!x.resolved}:x))}>{c.resolved?"Reopen":"Resolve"}</button>
        <button aria-label="Delete comment" onClick={()=>onUpdate(comments.filter(x=>x.id!==c.id))}>Delete</button>
      </div>
    </article>)}
  </section>;
}
