import type { Editor } from "@tiptap/react";
import type { Action } from "./logic";

export function deleteBlock(editor: Editor, pos: number) {
  const n = editor.state.doc.nodeAt(pos); if (!n) return false;
  const tr = editor.state.tr;
  if (editor.state.doc.childCount === 1) tr.replaceWith(0,n.nodeSize,editor.schema.nodes.paragraph.create());
  else tr.delete(pos,pos+n.nodeSize);
  editor.view.dispatch(tr.scrollIntoView()); editor.commands.focus(); return true;
}
export function duplicateBlock(editor: Editor, pos: number) {
  const n = editor.state.doc.nodeAt(pos); if(!n) return false;
  editor.view.dispatch(editor.state.tr.insert(pos+n.nodeSize,n.copy(n.content)).scrollIntoView()); return true;
}
export function moveBlock(editor: Editor, from: number, to: number) {
  const n = editor.state.doc.nodeAt(from);
  if (!n || from === to || (to > from && to < from+n.nodeSize)) return false;
  const tr = editor.state.tr.delete(from,from+n.nodeSize);
  const destination = tr.mapping.map(to);
  if (destination === from) return false;
  editor.view.dispatch(tr.insert(destination,n).scrollIntoView()); return true;
}
export function focusBlock(editor: Editor, pos: number) {
  const n = editor.state.doc.nodeAt(pos); if(!n) return false;
  const where = Math.min(editor.state.doc.content.size,pos+(n.isTextblock ? 1 : 2));
  editor.commands.setTextSelection(where); editor.commands.focus(); return true;
}
export function insertBlock(editor: Editor, id: Action, pos: number) {
  focusBlock(editor,pos); const c = editor.chain().focus();
  switch(id) {
    case "paragraph": return c.setParagraph().run();
    case "h1": return c.setHeading({level:1}).run();
    case "h2": return c.setHeading({level:2}).run();
    case "h3": return c.setHeading({level:3}).run();
    case "bullet": return c.toggleBulletList().run();
    case "numbered": return c.toggleOrderedList().run();
    case "task": return c.toggleTaskList().run();
    case "quote": return c.toggleBlockquote().run();
    case "code": return c.toggleCodeBlock().run();
    case "callout": return c.insertContent({type:"callout",content:[{type:"paragraph",content:[{type:"text",text:"Write a callout…"}]}]}).run();
    case "divider": return c.setHorizontalRule().run();
    case "image": return c.insertContent({type:"image",attrs:{src:"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1100&q=85",alt:"Sample landscape",width:"80%",caption:"Edit caption"}}).run();
    case "table": return c.insertTable({rows:3,cols:3,withHeaderRow:true}).run();
    default: return false;
  }
}
export function applyBlockAction(editor: Editor, id: Action, pos: number, cellPos?: number) {
  if(id === "duplicate") return duplicateBlock(editor,pos);
  if(id === "delete") return deleteBlock(editor,pos);
  if(id === "table-delete") { if(cellPos != null && !("$anchorCell" in editor.state.selection)) editor.commands.setTextSelection(cellPos);
  else if(cellPos == null) focusBlock(editor,pos); return editor.chain().focus().deleteTable().run(); }
  if(id === "insert-below") {
    const n=editor.state.doc.nodeAt(pos); if(!n) return false;
    const p=pos+n.nodeSize; return editor.chain().insertContentAt(p,{type:"paragraph"}).focus(p+1).run();
  }
  if(["paragraph","h1","h2","h3","bullet","numbered","task","quote","callout","code","divider","image","table"].includes(id)) return insertBlock(editor,id,pos);
  if(cellPos != null) editor.commands.setTextSelection(cellPos); else focusBlock(editor,pos);
  const c=editor.chain().focus();
  switch(id) {
    case "align-left": return c.setTextAlign("left").run();
    case "align-center": return c.setTextAlign("center").run();
    case "align-right": return c.setTextAlign("right").run();
    case "indent": return c.sinkListItem("listItem").run();
    case "outdent": return c.liftListItem("listItem").run();
    case "row-add": return c.addRowAfter().run();
    case "row-before": return c.addRowBefore().run();
    case "col-before": return c.addColumnBefore().run();
    case "merge-cells": return c.mergeCells().run();
    case "split-cell": return c.splitCell().run();
    case "header-row": return c.toggleHeaderRow().run();
    case "header-column": return c.toggleHeaderColumn().run();
    case "header-cell": return c.toggleHeaderCell().run();
    case "row-delete": return c.deleteRow().run();
    case "col-add": return c.addColumnAfter().run();
    case "col-delete": return c.deleteColumn().run();
    default: return false;
  }
}
