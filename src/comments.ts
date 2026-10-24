import type { Editor } from '@tiptap/react';
import { readSession } from './session';
import { COMMENTS_KEY, writeStorage } from './storage';
import { normalizeImageAnchor } from './docs-content/imageCommentModel';
import type { ImageAnchor } from './docs-content/imageCommentModel';
import { goToHeading } from './HeadingFolding';
export type Reply = { id: string; text: string; createdAt: string };
export type Comment = { id: string; text: string; excerpt: string; resolved: boolean; createdAt: string; replies?: Reply[]; image?: ImageAnchor; reactions?: string[] };
export type CommentTarget = { pos: number; from?: number; to?: number; cellPos?: number };
export function normalizeComments(value: unknown): Comment[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.filter((item): item is Comment => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || typeof item.text !== 'string' || item.id.length === 0 || seen.has(item.id.slice(0, 100))) return false;
    seen.add(item.id.slice(0, 100)); return true;
  }).slice(0, 1000).map(item => ({
    id: item.id.slice(0, 100), text: item.text.slice(0, 10000), excerpt: typeof item.excerpt === 'string' ? item.excerpt.slice(0, 200) : '',
    resolved: item.resolved === true, createdAt: typeof item.createdAt === 'string' ? item.createdAt : '', image: normalizeImageAnchor(item.image),
    reactions: Array.isArray(item.reactions) ? item.reactions.filter(value => typeof value === 'string' && value.length <= 16).slice(0, 8) : [],
    replies: Array.isArray(item.replies) ? item.replies.filter(r => r && typeof r.id === 'string' && typeof r.text === 'string').slice(0, 100).map(r => ({ id: r.id.slice(0, 100), text: r.text.slice(0, 10000), createdAt: typeof r.createdAt === 'string' ? r.createdAt : '' })) : [],
  }));
}
export function readComments(): Comment[] { return normalizeComments(readSession().comments); }
export function persistComments(comments: Comment[]) { return writeStorage(COMMENTS_KEY, comments); }
export function commentRanges(editor: Editor, id: string) {
  const ranges: { from: number; to: number }[] = [];
  editor.state.doc.descendants((node, pos) => { if (node.isText && node.marks.some(mark => mark.type.name === 'comment' && mark.attrs.commentId === id)) ranges.push({ from: pos, to: pos + node.nodeSize }); });
  return ranges;
}
export function anchorComment(editor: Editor, target: CommentTarget, id: string): string {
  let from = Math.max(0, target.from ?? editor.state.selection.from), to = Math.min(editor.state.doc.content.size, target.to ?? editor.state.selection.to), targetPos = target.pos;
  if (target.cellPos !== undefined) { const resolved = editor.state.doc.resolve(target.cellPos); if (resolved.depth) targetPos = resolved.before(resolved.depth); }
  const node = editor.state.doc.nodeAt(targetPos);
  if (from >= to || !editor.state.doc.textBetween(from, to, ' ').trim()) {
    const ranges: { from: number; to: number }[] = [];
    node?.descendants((child, offset) => { if (!ranges.length && child.isText && child.text?.trim()) ranges.push({ from: targetPos + 1 + offset, to: targetPos + 1 + offset + child.nodeSize }); });
    if (ranges.length) ({ from, to } = ranges[0]);
  }
  const mark = editor.schema.marks.comment;
  if (!mark || from >= to) throw new Error('Select text to attach a comment.');
  let conflict = false;
  editor.state.doc.nodesBetween(from, to, child => { if (child.marks.some(m => m.type === mark && m.attrs.commentId !== id)) conflict = true; });
  if (conflict) throw new Error('This text already has a comment. Reply to its existing thread.');
  const tr = editor.state.tr.addMark(from, to, mark.create({ commentId: id })).setMeta('docs-direct-edit', true);
  if (!tr.docChanged) throw new Error('Comments cannot be attached to this block.');
  editor.view.dispatch(tr); return editor.state.doc.textBetween(from, to, ' ').slice(0, 100);
}
export function removeCommentMark(editor: Editor, id: string) {
  if (!editor.isEditable) return;
  const tr = editor.state.tr.setMeta('docs-direct-edit', true);
  for (const range of commentRanges(editor, id)) tr.removeMark(range.from, range.to, editor.schema.marks.comment.create({ commentId: id }));
  if (tr.docChanged) editor.view.dispatch(tr);
}
export function jumpToComment(editor: Editor, id: string, comment?: Comment): boolean {
  if (comment?.image) {
    let position: number | null = null;
    editor.state.doc.descendants((node, pos) => { if (node.attrs.blockId === comment.image!.blockId) position = pos; });
    if (position === null) return false;
    goToHeading(editor, position); editor.view.dom.dispatchEvent(new CustomEvent('docs-focus-image-comment', { detail: id })); return true;
  }
  const ranges = commentRanges(editor, id); if (!ranges.length) return false;
  goToHeading(editor, ranges[0].from); editor.chain().focus().setTextSelection({ from: ranges[0].from, to: ranges.at(-1)!.to }).scrollIntoView().run(); return true;
}
