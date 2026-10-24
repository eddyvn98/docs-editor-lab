import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Editor } from '@tiptap/react';
import { Check, CheckCheck, MessageSquare, MoreHorizontal, Send, X } from 'lucide-react';
import type { Comment } from './comments';
import { jumpToComment, removeCommentMark } from './comments';
import { t } from './docs-ui/locale';
const reactions = ['\u{1f44d}', '\u{2764}\ufe0f', '\u{1f389}'];
export function CommentsPanel({ editor, comments, onUpdate, readOnly = false }: {
  editor: Editor; comments: Comment[]; onUpdate: Dispatch<SetStateAction<Comment[]>>; readOnly?: boolean;
}) {
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open'), [active, setActive] = useState(''), [message, setMessage] = useState('');
  useEffect(() => {
    const open = (event: Event) => { setActive(String((event as CustomEvent).detail)); setFilter('all'); };
    editor.view.dom.addEventListener('docs-open-comment', open); return () => editor.view.dom.removeEventListener('docs-open-comment', open);
  }, [editor]);
  useEffect(() => { if (active) document.getElementById(`comment-${active}`)?.scrollIntoView({ block: 'nearest' }); }, [active, filter]);
  const update = (id: string, patch: Partial<Comment>) => { if (!readOnly && editor.isEditable) onUpdate(current => current.map(comment => comment.id === id ? { ...comment, ...patch } : comment)); };
  const remove = (id: string) => { if (!readOnly && editor.isEditable) { removeCommentMark(editor, id); onUpdate(current => current.filter(comment => comment.id !== id)); } };
  const list = comments.filter(comment => filter === 'all' || comment.resolved === (filter === 'resolved'));
  return <section className="comments-panel docs-thread-panel" aria-label="Comment threads">
    <div className="docs-thread-filter"><select aria-label="Comment filter" value={filter} onChange={event => setFilter(event.target.value as typeof filter)}><option value="open">{t('Open comments')}</option><option value="resolved">{t('Resolved')}</option><option value="all">{t('All comments')}</option></select><span>{list.length}</span></div>
    {!list.length && <div className="docs-panel-empty"><MessageSquare size={28}/><strong>{t('No comments yet')}</strong><p>{t('Select text or an image region to start a conversation.')}</p></div>}
    {list.map(comment => <CommentCard key={comment.id} comment={comment} readOnly={readOnly} active={active === comment.id} onActivate={() => { setActive(comment.id); if (!jumpToComment(editor, comment.id, comment)) setMessage(t('The original content is no longer in this document.')); }} onUpdate={patch => update(comment.id, patch)} onRemove={() => remove(comment.id)}/>)}
    {message && <p role="status" className="docs-muted">{message}<button aria-label="Dismiss comment notice" onClick={() => setMessage('')}><X size={12}/></button></p>}
  </section>;
}
function CommentCard({ comment, readOnly, active, onActivate, onUpdate, onRemove }: {
  comment: Comment; readOnly: boolean; active: boolean; onActivate: () => void; onUpdate: (patch: Partial<Comment>) => void; onRemove: () => void;
}) {
  const [reply, setReply] = useState(''), [replying, setReplying] = useState(false), [menu, setMenu] = useState(false), [editing, setEditing] = useState(false), [draft, setDraft] = useState(comment.text), [confirm, setConfirm] = useState(false);
  const send = () => { if (readOnly || !reply.trim()) return; onUpdate({ replies: [...(comment.replies || []), { id: crypto.randomUUID(), text: reply.trim(), createdAt: new Date().toISOString() }] }); setReply(''); setReplying(false); };
  const date = (value: string) => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  return <article id={`comment-${comment.id}`} className={`docs-comment-card ${active ? 'is-active' : ''} ${comment.resolved ? 'is-resolved' : ''}`}>
    <header><span className="docs-avatar">Y</span><div><strong>{t('You')}</strong><time dateTime={comment.createdAt}>{date(comment.createdAt)}</time></div>
      {comment.resolved && <CheckCheck size={15} aria-label="Resolved"/>}
      {!readOnly && <><button aria-label={comment.resolved ? 'Reopen comment' : 'Resolve comment'} title={t(comment.resolved ? 'Reopen' : 'Resolve')} onClick={() => onUpdate({ resolved: !comment.resolved })}><Check size={16}/></button><button aria-label="Comment actions" aria-expanded={menu} onClick={() => setMenu(value => !value)}><MoreHorizontal size={16}/></button></>}
    </header>
    {(comment.excerpt || comment.image) && <button className="docs-comment-excerpt" onClick={onActivate}>{comment.image ? t('Image region') : comment.excerpt}</button>}
    {menu && !readOnly && <div className="docs-comment-actions"><button onClick={() => { setDraft(comment.text); setEditing(true); setMenu(false); }}>{t('Edit')}</button><button onClick={() => { setConfirm(true); setMenu(false); }}>{t('Delete')}</button></div>}
    {confirm && !readOnly && <div className="docs-comment-confirm"><span>{t('Delete this thread?')}</span><button onClick={() => setConfirm(false)}>{t('Cancel')}</button><button className="destructive" onClick={onRemove}>{t('Delete')}</button></div>}
    {editing && !readOnly ? <div className="docs-comment-edit"><textarea aria-label="Edit comment" value={draft} maxLength={10000} onChange={event => setDraft(event.target.value)}/><button onClick={() => setEditing(false)}>{t('Cancel')}</button><button disabled={!draft.trim()} onClick={() => { onUpdate({ text: draft.trim() }); setEditing(false); }}>{t('Save')}</button></div> : <p className="docs-comment-text">{comment.text}</p>}
    {!readOnly && <div className="docs-comment-reactions">{reactions.map(emoji => <button key={emoji} aria-label={`React ${emoji}`} aria-pressed={comment.reactions?.includes(emoji) || false} onClick={() => onUpdate({ reactions: comment.reactions?.includes(emoji) ? comment.reactions.filter(value => value !== emoji) : [...(comment.reactions || []), emoji] })}>{emoji}{comment.reactions?.includes(emoji) && <small>1</small>}</button>)}<button onClick={() => setReplying(value => !value)}>{t('Reply')}</button></div>}
    {(comment.replies || []).map(item => <div className="docs-comment-reply" key={item.id}><strong>{t('You')}</strong><time dateTime={item.createdAt}>{date(item.createdAt)}</time><p>{item.text}</p></div>)}
    {replying && !readOnly && <form className="docs-reply-form" onSubmit={event => { event.preventDefault(); send(); }}><textarea autoFocus aria-label="Reply to comment" placeholder={t('Write a reply')} value={reply} maxLength={10000} onChange={event => setReply(event.target.value)} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); send(); } }}/><button type="submit" disabled={!reply.trim()} aria-label="Send reply"><Send size={16}/></button></form>}
  </article>;
}
