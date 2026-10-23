import { useEffect } from "react";
import type { Editor } from "@tiptap/react";
import type { Popup } from "./targets";
import { positionById } from "./BlockIdentity";
import { duplicateBlock, moveSibling } from "./actions";

export function useEditorShortcuts(editor: Editor | null, open: (popup: Popup) => void) {
  useEffect(() => {
    if (!editor) return;
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || !editor.isFocused) return;
      const selection = editor.state.selection;
      const pos = selection.$from.depth ? selection.$from.before(1) : selection.from;
      if (event.altKey && event.shiftKey && ["ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault(); moveSibling(editor, pos, event.key === "ArrowUp" ? -1 : 1); return;
      }
      if (!(event.ctrlKey || event.metaKey)) return;
      const name = event.key.toLowerCase();
      if (name === "d" && event.shiftKey) { event.preventDefault(); duplicateBlock(editor, pos); return; }
      if (name !== "k" && !(name === "m" && event.shiftKey)) return;
      event.preventDefault();
      const rect = editor.view.coordsAtPos(selection.from), type = name === "k" ? "link" : "comment";
      open({ type, block: type === "link" ? "link" : "text", pos,
        from: selection.from, to: selection.to, anchor: { element: null, point: { x: rect.left, y: rect.bottom }, mode: "caret", from: selection.from } });
    };
    const navigate = () => {
      const id = window.location.hash.slice(1);
      if (!id.startsWith("block-")) return;
      const pos = positionById(editor, id.slice(6));
      if (pos !== null) {
        const dom = editor.view.nodeDOM(pos);
        if (dom instanceof HTMLElement) { dom.scrollIntoView({ block: "center" }); dom.animate([{ outline: "2px solid #4a88de" }, { outline: "2px solid transparent" }], 1800); }
      }
    };
    const timer = window.setTimeout(navigate, 0);
    document.addEventListener("keydown", key); window.addEventListener("hashchange", navigate);
    return () => { clearTimeout(timer); document.removeEventListener("keydown", key); window.removeEventListener("hashchange", navigate); };
  }, [editor, open]);
}
