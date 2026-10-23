import { useCallback, useEffect, useState } from "react";
import type { MouseEvent as ReactMouse, DragEvent as ReactDrag } from "react";
import type { Editor } from "@tiptap/react";
import { kindFor, slashQuery } from "./logic";
import type { Kind, Point } from "./logic";
import { moveBlock } from "./actions";

export type Anchor = { element: HTMLElement | null; point: Point; offset?: Point; mode?: "caret"|"selection"|"element"|"pointer" };
export type Popup = { type: "menu"|"insert"|"slash"|"link"|"image"|"comment"; block: Kind; pos: number; anchor: Anchor; query?: string; cellPos?: number; from?: number; to?: number };
export type Hover = { pos: number; element: HTMLElement; empty: boolean };
function topBlock(editor: Editor, target: EventTarget | null): Hover | null {
  let el = target instanceof HTMLElement ? target : null;
  const root = editor.view.dom;
  while (el && el.parentElement !== root) el = el.parentElement;
  if (!el || el.parentElement !== root) return null;
  let pos: number;
  try {
    const mapped = editor.view.posAtDOM(el,0);
    const resolved = editor.state.doc.resolve(mapped);
    pos = resolved.depth > 0 ? resolved.before(1) : mapped;
  } catch { return null; }
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return null;
  return { pos, element:el, empty:node.type.name === "paragraph" && !node.textContent.trim() };
}
function pointerAnchor(el: HTMLElement, point: Point): Anchor {
  const r = el.getBoundingClientRect();
  return {element:el,point,offset:{x:point.x-r.left,y:point.y-r.top},mode:"pointer"};
}
function caretAnchor(editor: Editor): Anchor {
  const r = editor.view.coordsAtPos(editor.state.selection.from);
  return {element:null,point:{x:r.left,y:r.bottom + 6},mode:"caret"};
}
export function useEditorUX(editor: Editor | null) {
  const [hover,setHover] = useState<Hover|null>(null);
  const [popup,setPopup] = useState<Popup|null>(null);
  const [selectionAnchor,setSelectionAnchor] = useState<Anchor|null>(null);
  const close = useCallback(() => setPopup(null),[]);
  const trackSelection = useCallback(() => {
    if(!editor || editor.state.selection.empty || !editor.isFocused) {setSelectionAnchor(null);return;}
    const selection = window.getSelection();
    if(!selection || selection.isCollapsed || !editor.view.dom.contains(selection.anchorNode)) {setSelectionAnchor(null);return;}
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    if(rect.width || rect.height) setSelectionAnchor({element:null,point:{x:rect.left,y:rect.top},mode:"selection"});
  },[editor]);
  useEffect(() => {
    if(!editor) return;
    const onUpdate = () => {
      const {selection,doc} = editor.state;
      if(popup && popup.type !== "slash" && !doc.nodeAt(popup.pos)) setPopup(null);
      if(selection.empty && selection.$from.parent.type.name === "paragraph") {
        const q = slashQuery(selection.$from.parent.textContent);
        if(q !== null && selection.$from.parentOffset === selection.$from.parent.content.size) {
          const pos = selection.$from.before(selection.$from.depth);
          setPopup({type:"slash",block:"paragraph",pos,anchor:caretAnchor(editor),query:q});
          setSelectionAnchor(null);
          return;
        }
      }
      setPopup(p => p?.type === "slash" ? null : p);
      trackSelection();
    };
    editor.on("update",onUpdate);
    editor.on("selectionUpdate",trackSelection);
    const onPointer = (event: PointerEvent) => {
      const t = event.target;
      if(t instanceof Element && (t.closest("[data-ux-overlay]") || t.closest("[data-ux-gutter]"))) return;
      setPopup(null);
      if(!(t instanceof Node && editor.view.dom.contains(t))) setSelectionAnchor(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if(event.key === "Escape") {setPopup(null);setSelectionAnchor(null);}
    };
    document.addEventListener("pointerdown",onPointer,true);
    document.addEventListener("keydown",onKey);
    return () => {
      editor.off("update",onUpdate);editor.off("selectionUpdate",trackSelection);
      document.removeEventListener("pointerdown",onPointer,true);
      document.removeEventListener("keydown",onKey);
    };
  },[editor,trackSelection,popup]);
  const onMouseMove = (event: ReactMouse<HTMLDivElement>) => {
    if(!editor) return;
    const found = topBlock(editor,event.target);
    if(found && (found.pos !== hover?.pos || found.element !== hover.element)) setHover(found);
  };
  const onContextMenu = (event: ReactMouse<HTMLDivElement>) => {
    if(!editor || !editor.view.dom.contains(event.target as Node)) return;
    const found = topBlock(editor,event.target);
    if(!found) return;
    event.preventDefault();
    const target = event.target as HTMLElement;
    const cell = target.closest<HTMLElement>("td,th");
    const link = target.closest<HTMLElement>("a[href]");
    const node = editor.state.doc.nodeAt(found.pos);
    const point = {x:event.clientX,y:event.clientY};
    let cellPos: number | undefined;
    if(cell) {
      const p=editor.view.posAtCoords({left:point.x,top:point.y});
      cellPos=p?.pos;
      if(typeof cellPos==="number") editor.commands.setTextSelection(cellPos);
    } else if(link) {
      const p=editor.view.posAtCoords({left:point.x,top:point.y});
      if(p) editor.commands.setTextSelection(p.pos);
    }
    setSelectionAnchor(null);
    setPopup({type:"menu",block:cell ? "cell" : link ? "link" : kindFor(node?.type.name || ""),pos:found.pos,
      cellPos,anchor:pointerAnchor(found.element,point)});
  };
  const onClick = (event: ReactMouse<HTMLDivElement>) => {
    if(!editor) return;
    const target=event.target as HTMLElement;
    const found=topBlock(editor,target);
    if(!found) return;
    const img=target.closest<HTMLElement>(".image-figure");
    const link=target.closest<HTMLAnchorElement>("a[href]");
    if(img) {
      editor.commands.setNodeSelection(found.pos);
      setPopup({type:"image",block:"image",pos:found.pos,anchor:{element:img,point:{x:0,y:0},mode:"element"}});
    } else if(link) {
      event.preventDefault();
      const point=editor.view.posAtCoords({left:event.clientX,top:event.clientY});
      if(point) editor.commands.setTextSelection(point.pos);
      setPopup({type:"link",block:"link",pos:found.pos,anchor:{element:link,point:{x:0,y:0},mode:"element"},
        from:editor.state.selection.from,to:editor.state.selection.to});
    }
  };
  const openGutter = (type: "menu"|"insert", entry: Hover) => {
    const r=entry.element.getBoundingClientRect();
    const node=editor?.state.doc.nodeAt(entry.pos);
    setPopup({type,block:kindFor(node?.type.name || "paragraph"),pos:entry.pos,
      anchor:{element:entry.element,point:{x:r.left-30,y:r.top+12},offset:{x:-30,y:12},mode:"pointer"}});
  };
  const onDragStart = (event: ReactDrag<HTMLElement>, source: number) => {
    event.dataTransfer.setData("application/x-doc-block",String(source));
    event.dataTransfer.effectAllowed="move";
  };
  const onDrop = (event: ReactDrag<HTMLDivElement>) => {
    if(!editor) return;
    const raw=event.dataTransfer.getData("application/x-doc-block");
    if(!raw) return;
    event.preventDefault();
    const source=Number(raw);
    const found=topBlock(editor,event.target);
    if(found && Number.isInteger(source)) moveBlock(editor,source,found.pos);
    setHover(null);setPopup(null);
  };
  const onDragOver = (event: ReactDrag<HTMLDivElement>) => {
    if(event.dataTransfer.types.includes("application/x-doc-block")) event.preventDefault();
  };
  return {hover,setHover,popup,setPopup,selectionAnchor,setSelectionAnchor,close,
    onMouseMove,onContextMenu,onClick,openGutter,onDragStart,onDrop,onDragOver,trackSelection};
}
