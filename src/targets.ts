import type { Editor } from "@tiptap/react";
import { Selection } from "@tiptap/pm/state";
import type { SelectionBookmark, Transaction } from "@tiptap/pm/state";
import type { Kind, Point } from "./logic";
import { positionById } from "./BlockIdentity";

export type Anchor = {
  element: HTMLElement | null; point: Point; offset?: Point;
  mode?: "caret" | "selection" | "element" | "pointer";
  pos?: number; from?: number; to?: number;
};
export type Popup = {
  type: "menu" | "insert" | "slash" | "link" | "image" | "comment";
  block: Kind; pos: number; anchor: Anchor; query?: string;
  cellPos?: number; from?: number; to?: number;
  blockId?: string; nodeType?: string; bookmark?: SelectionBookmark;
};
export type Hover = { pos: number; element: HTMLElement; empty: boolean };
export function captureTarget(editor: Editor, popup: Popup): Popup {
  const node = editor.state.doc.nodeAt(popup.pos);
  const from = popup.from ?? editor.state.selection.from, to = popup.to ?? editor.state.selection.to;
  return { ...popup, nodeType: node?.type.name, blockId: node?.attrs.blockId,
    bookmark: popup.bookmark || editor.state.selection.getBookmark(),
    from, to,
    anchor: { ...popup.anchor, pos: popup.pos, ...(popup.block === "link" ? { mode: "caret" as const, from, to } : {}) } };
}
export function remapTarget(editor: Editor, popup: Popup, tr: Transaction): Popup | null {
  const mapped = tr.mapping.mapResult(popup.pos, 1);
  const byId = popup.blockId ? positionById(editor, popup.blockId) : null;
  const pos = byId ?? mapped.pos;
  if ((popup.blockId && byId === null) || (!popup.blockId && mapped.deleted)) return null;
  const node = editor.state.doc.nodeAt(pos);
  if (!node || (popup.nodeType && node.type.name !== popup.nodeType)) return null;
  const from = popup.from === undefined ? undefined : tr.mapping.map(popup.from, 1);
  const to = popup.to === undefined ? undefined : popup.to === popup.from ? from : tr.mapping.map(popup.to, -1);
  return { ...popup, pos, from, to,
    cellPos: popup.cellPos === undefined ? undefined : tr.mapping.map(popup.cellPos, 1),
    bookmark: popup.bookmark?.map(tr.mapping),
    anchor: { ...popup.anchor, pos, from, to, element: popup.anchor.element?.isConnected ? popup.anchor.element : editor.view.nodeDOM(pos) as HTMLElement | null } };
}
export function restoreTarget(editor: Editor, popup: Popup, focus = true): boolean {
  if (editor.isDestroyed) return false;
  try {
    const selection = popup.bookmark?.resolve(editor.state.doc) || Selection.near(editor.state.doc.resolve(popup.pos));
    editor.view.dispatch(editor.state.tr.setSelection(selection));
    if (focus) editor.view.focus();
    return true;
  } catch { return false; }
}
/** Resolve an image/table inside a column instead of mistaking its container for it. */
export function blockFromDOM(editor: Editor, target: EventTarget | null, nested = false): Hover | null {
  const root = editor.view.dom;
  let el = target instanceof Element ? target : null;
  if (!el || !root.contains(el)) return null;
  if (nested) el = el.closest("[data-node-view-wrapper],.image-figure,table,pre,blockquote,aside,p,h1,h2,h3,li,hr") || el;
  else while (el && el.parentElement !== root) el = el.parentElement;
  if (!(el instanceof HTMLElement) || el === root) return null;
  try {
    const raw = editor.view.posAtDOM(el, 0);
    const resolved = editor.state.doc.resolve(raw);
    let pos = resolved.depth ? resolved.before(nested ? resolved.depth : 1) : raw;
    if (nested) {
      const direct = editor.state.doc.nodeAt(raw);
      if (direct && direct.isAtom && !direct.isText && !el.matches("p,h1,h2,h3,li")) pos = raw;
      if (el.matches("table")) {
        for (let depth = resolved.depth; depth > 0; depth--) {
          if (resolved.node(depth).type.name === "table") { pos = resolved.before(depth); break; }
        }
      }
    }
    const node = editor.state.doc.nodeAt(pos);
    return node ? { pos, element: el, empty: node.type.name === "paragraph" && node.content.size === 0 } : null;
  } catch { return null; }
}
