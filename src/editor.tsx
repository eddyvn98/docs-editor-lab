import { Node, getSchema, mergeAttributes } from '@tiptap/core';
import type { JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { TableKit } from '@tiptap/extension-table';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { CommentMark } from './CommentMark';
import { Column, Columns } from './Columns';
import { BlockIdentity } from './BlockIdentity';
import { DocumentImage } from './DocumentImage';
import { SearchHighlights } from './SearchHighlights';
import { HeadingFolding } from './HeadingFolding';
import { DocumentAppearance } from './DocumentAppearance';
import { ToggleBlock, PageBreak } from './features/AdvancedBlocks';
import { starterContent } from './sampleContent';
import { validateDocument } from './contentIO';
import { DOCUMENT_KEY, RECOVERY_KEY } from './storage';
import { SESSION_KEY } from './session';
export { starterContent } from './sampleContent';
export const STORAGE_KEY = DOCUMENT_KEY;
export let startupIssue = '';
const Callout = Node.create({
  name: 'callout', group: 'block', content: 'block+', defining: true,
  parseHTML() { return [{ tag: 'aside[data-type="callout"]' }]; },
  renderHTML({ HTMLAttributes }) { return ['aside', mergeAttributes({ 'data-type': 'callout', class: 'callout' }, HTMLAttributes), 0]; },
});
export const extensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false }),
  Link.configure({ openOnClick: false, autolink: true }),
  DocumentImage.configure({ inline: false, allowBase64: true }), Callout,
  TableKit.configure({ table: { resizable: true } }), TaskList, TaskItem.configure({ nested: true }),
  TextAlign.configure({ types: ['paragraph', 'heading'] }), Highlight.configure({ multicolor: true }),
  TextStyleKit, CommentMark, Column, Columns, BlockIdentity, SearchHighlights, HeadingFolding, DocumentAppearance,
  ToggleBlock, PageBreak,
];
export function readLocalDocument(): string | JSONContent {
  startupIssue = '';
  let raw: string | null = null;
  try {
    const savedSession = localStorage.getItem(SESSION_KEY);
    raw = savedSession ?? localStorage.getItem(DOCUMENT_KEY);
    if (!raw) return starterContent;
    const parsed = JSON.parse(raw) as unknown;
    const doc = savedSession ? (parsed as { doc?: unknown }).doc : parsed;
    return validateDocument(doc, { schema: getSchema(extensions) });
  } catch {
    startupIssue = raw ? 'The saved document could not be loaded. Autosave is paused; download the recovery data before keeping this new copy.' : 'Browser storage is unavailable. Export JSON before closing.';
    if (raw) { try { localStorage.setItem(RECOVERY_KEY, raw); } catch { /* Keep the original untouched. */ } }
    return starterContent;
  }
}
