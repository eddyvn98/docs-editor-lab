import type { Editor } from "@tiptap/react";
import type { Action } from "./logic";
import type { Popup } from "./targets";
import { restoreTarget } from "./targets";
import { applyBlockAction, insertBlock } from "./actions";
import { copyText, downloadImage } from "./clipboard";
import { safeLink } from "./safety";

export async function executeAction(editor: Editor, popup: Popup, id: Action): Promise<void> {
  if (!editor.state.doc.nodeAt(popup.pos)) throw new Error("This block no longer exists.");
  restoreTarget(editor, popup, false);
  if (popup.type === "slash" || popup.type === "insert") {
    if (!insertBlock(editor, id, popup.pos, popup.type === "slash")) throw new Error("This block cannot be inserted here.");
    return;
  }
  const node = editor.state.doc.nodeAt(popup.pos)!;
  const href = safeLink(String(editor.getAttributes("link").href || ""));
  if (id === "link-copy") { await copyText(href || ""); return; }
  if (id === "image-copy") { await copyText(String(node.attrs.src || "")); return; }
  if (id === "image-download") { await downloadImage(String(node.attrs.src || "")); return; }
  if (id === "block-link") {
    if (!node.attrs.blockId) throw new Error("Block is not ready. Try again.");
    const url = new URL(window.location.href); url.hash = `block-${node.attrs.blockId}`;
    await copyText(url.href); return;
  }
  if (id === "copy") {
    const selection = editor.state.selection;
    const text = popup.block === "cell" && !selection.empty ? selection.content().content.textBetween(0, selection.content().content.size, "\t") : node.textBetween(0, node.content.size, "\n");
    await copyText(text); return;
  }
  if (id === "link-open") { if (!href) throw new Error("Invalid link."); window.open(href, "_blank", "noopener,noreferrer"); return; }
  if (id === "link-remove") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
  if (!applyBlockAction(editor, id, popup.pos, popup.cellPos)) throw new Error("This action is not available for the selected block.");
}
