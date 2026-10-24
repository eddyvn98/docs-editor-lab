import type { Editor } from '@tiptap/react';
import type { Comment } from '../comments';
export type ImageAnchor = { blockId: string; sourceKey: string; x: number; y: number; width: number; height: number };
export function imageSourceKey(source: string): string {
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  return `${source.length}-${(hash >>> 0).toString(16)}`;
}
export function normalizeImageAnchor(value: unknown): ImageAnchor | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const a = value as Record<string, unknown>;
  if (typeof a.blockId !== 'string' || !/^[\w-]{1,80}$/.test(a.blockId) || typeof a.sourceKey !== 'string' || a.sourceKey.length > 100) return undefined;
  if (['x','y','width','height'].some(key => typeof a[key] !== 'number' || !Number.isFinite(a[key]))) return undefined;
  const x = Math.max(0, Math.min(99.9, a.x as number)), y = Math.max(0, Math.min(99.9, a.y as number));
  return { blockId: a.blockId, sourceKey: a.sourceKey, x, y, width: Math.max(0.1, Math.min(100 - x, a.width as number)), height: Math.max(0.1, Math.min(100 - y, a.height as number)) };
}
const comments = new WeakMap<Editor, Comment[]>();
export const imageCommentsFor = (editor: Editor) => comments.get(editor) || [];
export function setEditorComments(editor: Editor, value: Comment[]) { comments.set(editor, value); editor.view.dom.dispatchEvent(new Event('docs-comments-change')); }
