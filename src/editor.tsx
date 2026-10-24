import { getSchema } from '@tiptap/core';
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
import { BlockAppearance } from './BlockAppearance';
import { CalloutBlock } from './CalloutBlock';
import { CodeBlockTools } from './CodeBlockTools';
import { InlineSheet } from './InlineSheet';
import { DocsToc, DocsTimeline, DocsMermaid } from './DocsVisualBlocks';
import { ToggleBlock, PageBreak } from './features/AdvancedBlocks';
import { DocumentMetadata } from './docs-ui/DocumentMetadata';
import { BlockSelectionExtension } from './docs-ui/BlockSelectionExtension';
import { DocsHeading } from './docs-content/DocsHeading';
import { MediaBlock } from './docs-content/MediaBlock';
import { ImageGallery } from './docs-content/ImageGallery';
import { Equation, InlineEquation } from './docs-content/Equation';
import { SyncedBlock } from './docs-content/SyncedBlock';
import { Suggestions, SuggestionMark } from './docs-content/Suggestions';
import { ClipboardClean } from './docs-content/ClipboardClean';
import { SlashPlaceholder } from './docs-content/SlashPlaceholder';
import { starterContent } from './sampleContent';
import { validateDocument } from './contentIO';
import { DOCUMENT_KEY, RECOVERY_KEY } from './storage';
import { SESSION_KEY } from './session';
export { starterContent } from './sampleContent';
export const STORAGE_KEY = DOCUMENT_KEY;
export let startupIssue = '';
export const extensions = [
  StarterKit.configure({ heading: false, link: false }), DocsHeading,
  Link.configure({ openOnClick: false, autolink: true }),
  DocumentImage.configure({ inline: false, allowBase64: true }), CalloutBlock,
  TableKit.configure({ table: { resizable: true } }), TaskList, TaskItem.configure({ nested: true }),
  TextAlign.configure({ types: ['paragraph', 'heading'] }), Highlight.configure({ multicolor: true }),
  TextStyleKit, CommentMark, Column, Columns, BlockIdentity, SearchHighlights, HeadingFolding,
  DocumentAppearance, BlockAppearance, CodeBlockTools, ToggleBlock, PageBreak,
  // Keep the legacy schema for existing documents; Sheets is not offered in the Docs UI.
  InlineSheet, DocsToc, DocsTimeline, DocsMermaid,
  DocumentMetadata, BlockSelectionExtension, MediaBlock, ImageGallery, Equation, InlineEquation,
  SyncedBlock, SuggestionMark, Suggestions, ClipboardClean, SlashPlaceholder,
];
export function readLocalDocument(): string | JSONContent {
  startupIssue = ''; let raw: string | null = null;
  try {
    const savedSession = localStorage.getItem(SESSION_KEY); raw = savedSession ?? localStorage.getItem(DOCUMENT_KEY);
    if (!raw) return starterContent;
    const parsed = JSON.parse(raw) as unknown, doc = savedSession ? (parsed as { doc?: unknown }).doc : parsed;
    return validateDocument(doc, { schema: getSchema(extensions) });
  } catch {
    startupIssue = raw ? 'The saved document could not be loaded. Autosave is paused; download the recovery data before keeping this new copy.' : 'Browser storage is unavailable. Export JSON before closing.';
    if (raw) { try { localStorage.setItem(RECOVERY_KEY, raw); } catch { /* Preserve the original on storage failure. */ } }
    return starterContent;
  }
}
