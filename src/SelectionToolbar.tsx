import type { Editor } from "@tiptap/react";
import type { Anchor } from "./targets";
import { Anchored } from "./Anchored";
export function SelectionToolbar({ editor, anchor, onLink, onComment }: {
  editor: Editor; anchor: Anchor; onLink: () => void; onComment: () => void;
}) {
  const restore = () => {
    if (anchor.from !== undefined && anchor.to !== undefined) editor.commands.setTextSelection({ from: anchor.from, to: anchor.to });
  };
  const button = (label: string, run: () => void, active = false) => <button key={label} type="button" aria-label={label}
    title={label} aria-pressed={active} className={active ? "active" : ""} onPointerDown={e => e.preventDefault()}
    onClick={() => { restore(); run(); }}>{label}</button>;
  return <Anchored anchor={anchor} editor={editor} className="selection-bar">
    <div role="toolbar" aria-label="Selection formatting" className="selection-controls">
      {button("B", () => { editor.chain().focus().toggleBold().run(); }, editor.isActive("bold"))}
      {button("I", () => { editor.chain().focus().toggleItalic().run(); }, editor.isActive("italic"))}
      {button("U", () => { editor.chain().focus().toggleUnderline().run(); }, editor.isActive("underline"))}
      {button("S", () => { editor.chain().focus().toggleStrike().run(); }, editor.isActive("strike"))}
      {button("Code", () => { editor.chain().focus().toggleCode().run(); }, editor.isActive("code"))}
      {button("Highlight", () => { editor.chain().focus().toggleHighlight().run(); }, editor.isActive("highlight"))}
      <div className="color-tools" aria-label="Text color palette">
        {["#27344b", "#e2585b", "#2975d9"].map(color => <button key={color} type="button" aria-label={`Text color ${color}`}
          onPointerDown={e => e.preventDefault()} onClick={() => { restore(); editor.chain().focus().setColor(color).run(); }}>
          <span className="color-swatch" style={{ background: color }}/></button>)}
        {["#fff3b0", "#dcecff"].map(color => <button key={color} type="button" aria-label={`Background color ${color}`}
          onPointerDown={e => e.preventDefault()} onClick={() => { restore(); editor.chain().focus().setBackgroundColor(color).run(); }}>
          <span className="color-swatch" style={{ background: color }}/></button>)}
      </div>
      {button("Clear format", () => { editor.chain().focus().unsetBold().unsetItalic().unsetUnderline().unsetStrike().unsetCode().unsetHighlight().unsetColor().unsetBackgroundColor().run(); })}
      {button("Link", onLink)}{button("Comment", onComment)}
    </div>
  </Anchored>;
}
