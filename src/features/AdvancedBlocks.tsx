import { useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useEditorRevision } from "./useEditorRevision";

function ToggleView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
  useEditorRevision(editor);
  const [readingOpen, setReadingOpen] = useState(true);
  const open = editor.isEditable ? node.attrs.open !== false : readingOpen;
  return <NodeViewWrapper className="toggle-block" data-block-id={node.attrs.blockId}>
    <div contentEditable={false} className="toggle-summary">
      <button type="button" aria-label={open ? "Collapse toggle" : "Expand toggle"} aria-expanded={open}
        onClick={() => { if (editor.isEditable) updateAttributes({ open: !open }); else setReadingOpen(!open); }}>
        {open ? "-" : "+"}
      </button>
      <input aria-label="Toggle title" maxLength={200} value={String(node.attrs.title || "Details")} readOnly={!editor.isEditable}
        onChange={event => { if (editor.isEditable) updateAttributes({ title: event.target.value }); }}
        onKeyDown={event => {
          if (event.key === "Enter" && editor.isEditable) {
            event.preventDefault(); updateAttributes({ open: true });
            const pos = getPos(); if (typeof pos === "number") editor.commands.focus(pos + 2);
          }
        }}/>
    </div>
    <NodeViewContent className="toggle-body" style={{ display: open ? undefined : "none" }}/>
  </NodeViewWrapper>;
}
export const ToggleBlock = Node.create({
  name: "toggleBlock", group: "block", content: "block+", defining: true, isolating: true,
  addAttributes() {
    return {
      title: { default: "Details", parseHTML: element => element.getAttribute("data-title") || "Details", renderHTML: attrs => ({ "data-title": String(attrs.title).slice(0, 200) }) },
      open: { default: true, parseHTML: element => element.getAttribute("data-open") !== "false", renderHTML: attrs => ({ "data-open": String(attrs.open !== false) }) },
    };
  },
  parseHTML() { return [{ tag: 'section[data-type="toggleBlock"]', contentElement: '[data-toggle-content]' }]; },
  renderHTML({ node, HTMLAttributes }) {
    // Exports always retain the body, even when collapsed in the editor.
    return ["section", mergeAttributes(HTMLAttributes, { "data-type": "toggleBlock" }),
      ["strong", { "data-toggle-label": "" }, String(node.attrs.title || "Details")],
      ["div", { "data-toggle-content": "" }, 0]];
  },
  addNodeView() { return ReactNodeViewRenderer(ToggleView); },
});
export const PageBreak = Node.create({
  name: "pageBreak", group: "block", atom: true, selectable: true,
  parseHTML() { return [{ tag: 'div[data-type="pageBreak"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "pageBreak", class: "document-page-break", contenteditable: "false", role: "separator", "aria-label": "Page break", style: "break-after:page;page-break-after:always" })];
  },
});
