import type { Editor } from "@tiptap/react";
import { readSession } from "./session";
import { COMMENTS_KEY, writeStorage } from "./storage";

export type Reply = { id: string; text: string; createdAt: string };
export type Comment = { id: string; text: string; excerpt: string; resolved: boolean; createdAt: string; replies?: Reply[] };
export type CommentTarget = { pos: number; from?: number; to?: number; cellPos?: number };
export function normalizeComments(value: unknown): Comment[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.filter((item): item is Comment => {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || typeof item.text !== "string" || seen.has(item.id)) return false;
    seen.add(item.id); return true;
  }).slice(0, 1000).map(item => ({
    id: item.id, text: item.text.slice(0, 10000), excerpt: typeof item.excerpt === "string" ? item.excerpt : "",
    resolved: item.resolved === true, createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
    replies: Array.isArray(item.replies) ? item.replies.filter(r => r && typeof r.id === "string" && typeof r.text === "string")
      .slice(0, 100).map(r => ({ id: r.id, text: r.text.slice(0, 10000), createdAt: typeof r.createdAt === "string" ? r.createdAt : "" })) : [],
  }));
}
export function readComments(): Comment[] { return normalizeComments(readSession().comments); }
export function persistComments(comments: Comment[]) { return writeStorage(COMMENTS_KEY, comments); }
export function commentRanges(editor: Editor, id: string) {
  const ranges: { from: number; to: number }[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.marks.some(mark => mark.type.name === "comment" && mark.attrs.commentId === id)) {
      ranges.push({ from: pos, to: pos + node.nodeSize });
    }
  });
  return ranges;
}
export function anchorComment(editor: Editor, target: CommentTarget, id: string): string {
  let from = Math.max(0, target.from ?? editor.state.selection.from);
  let to = Math.min(editor.state.doc.content.size, target.to ?? editor.state.selection.to);
  let targetPos = target.pos;
  if (target.cellPos !== undefined) {
    const resolved = editor.state.doc.resolve(target.cellPos);
    if (resolved.depth) targetPos = resolved.before(resolved.depth);
  }
  const node = editor.state.doc.nodeAt(targetPos);
  if (from >= to || !editor.state.doc.textBetween(from, to, " ").trim()) {
    let first: { from: number; to: number } | null = null;
    node?.descendants((child, offset) => {
      if (!first && child.isText && child.text?.trim()) first = { from: targetPos + 1 + offset, to: targetPos + 1 + offset + child.nodeSize };
    });
    if (first) ({ from, to } = first);
  }
  const mark = editor.schema.marks.comment;
  if (!mark || from >= to) throw new Error("Select text to attach a comment.");
  let conflict = false;
  editor.state.doc.nodesBetween(from, to, node => {
    if (node.marks.some(m => m.type === mark && m.attrs.commentId !== id)) conflict = true;
  });
  if (conflict) throw new Error("This text already has a comment. Reply to its existing thread.");
  const tr = editor.state.tr.addMark(from, to, mark.create({ commentId: id }));
  if (!tr.docChanged) throw new Error("Comments cannot be attached to this block.");
  editor.view.dispatch(tr);
  return editor.state.doc.textBetween(from, to, " ").slice(0, 100);
}
export function removeCommentMark(editor: Editor, id: string) {
  const tr = editor.state.tr;
  for (const range of commentRanges(editor, id)) {
    tr.removeMark(range.from, range.to, editor.schema.marks.comment.create({ commentId: id }));
  }
  if (tr.docChanged) editor.view.dispatch(tr);
}
export function jumpToComment(editor: Editor, id: string): boolean {
  const ranges = commentRanges(editor, id);
  if (!ranges.length) return false;
  editor.chain().focus().setTextSelection({ from: ranges[0].from, to: ranges.at(-1)!.to }).scrollIntoView().run();
  return true;
}
