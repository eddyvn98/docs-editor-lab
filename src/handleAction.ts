import type { Editor } from '@tiptap/react';
import type { Action } from './logic';
import type { Popup } from './targets';
import { restoreTarget } from './targets';
import { applyBlockAction, insertBlock } from './actions';
import { applySlash } from './applySlash';
import { copyText, downloadImage } from './clipboard';
import { safeLink } from './safety';
import { requestDocs } from './docsEvents';

export async function executeAction(editor: Editor, popup: Popup, id: Action): Promise<void> {
  if (!editor.isEditable) throw new Error('Switch to Editing to use document actions.');
  if (!editor.state.doc.nodeAt(popup.pos)) throw new Error('This block no longer exists.');
  if (!restoreTarget(editor, popup, false)) throw new Error('The original selection was removed.');
  if (id === 'templates') {
    if (popup.type === 'slash' && !applySlash(editor, popup, 'templates')) throw new Error('The slash command changed. Type it again.');
    requestDocs(editor, { action: 'templates' }); return;
  }
  if (id === 'template-save' || id === 'block-style' || id === 'image-crop' || id === 'insert-below') {
    requestDocs(editor, { action: id, pos: popup.pos }); return;
  }
  if (popup.type === 'slash') {
    if (!applySlash(editor, popup, id)) throw new Error('This block cannot be inserted here. Existing content was preserved.');
    return;
  }
  if (popup.type === 'insert') {
    if (!insertBlock(editor, id, popup.pos)) throw new Error('This block cannot be inserted here.');
    return;
  }
  const node = editor.state.doc.nodeAt(popup.pos)!;
  const href = safeLink(String(editor.getAttributes('link').href || ''));
  if (id === 'link-copy') { await copyText(href || ''); return; }
  if (id === 'image-copy') { await copyText(String(node.attrs.src || '')); return; }
  if (id === 'image-download') { await downloadImage(String(node.attrs.src || '')); return; }
  if (id === 'block-link') {
    if (!node.attrs.blockId) throw new Error('Block is not ready. Try again.');
    const url = new URL(window.location.href); url.hash = `block-${node.attrs.blockId}`;
    await copyText(url.href); return;
  }
  if (id === 'copy') {
    const selection = editor.state.selection;
    const text = popup.block === 'cell' && !selection.empty ? selection.content().content.textBetween(0, selection.content().content.size, '\t') : node.textBetween(0, node.content.size, '\n');
    await copyText(text); return;
  }
  if (id === 'link-open') { if (!href) throw new Error('Invalid link.'); window.open(href, '_blank', 'noopener,noreferrer'); return; }
  if (id === 'link-remove') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
  if (!applyBlockAction(editor, id, popup.pos, popup.cellPos)) throw new Error('This action is not available for the selected block.');
}
