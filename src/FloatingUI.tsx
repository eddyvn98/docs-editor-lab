import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Anchored } from "./Anchored";
import { actionsFor, filterInserts } from "./logic";
import type { Action, Item } from "./logic";
import type { Anchor, Popup } from "./useEditorUX";

function Button({label,run,active=false}: {label:string;run:()=>void;active?:boolean}) {
  return <button type="button" aria-label={label} title={label} className={active ? "active" : ""}
    onPointerDown={e=>e.preventDefault()} onClick={run}>{label}</button>;
}
export function SelectionToolbar({editor,anchor,onLink,onComment}:{
  editor:Editor;anchor:Anchor;onLink:()=>void;onComment:()=>void;
}) {
  return <Anchored anchor={anchor} editor={editor} className="selection-bar">
    <Button label="B" run={()=>editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}/>
    <Button label="I" run={()=>editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}/>
    <Button label="U" run={()=>editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")}/>
    <Button label="S" run={()=>editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")}/>
    <Button label="Code" run={()=>editor.chain().focus().toggleCode().run()}/>
    <Button label="Highlight" run={()=>editor.chain().focus().toggleHighlight().run()}/>
    <span className="toolbar-divider"/>
    <Button label="Link" run={onLink}/>
    <Button label="Comment" run={onComment}/>
  </Anchored>;
}
function Menu({items,onChoose,onClose,query}:{
  items:Item[];onChoose:(action:Action)=>void;onClose:()=>void;query?:string;
}) {
  const [index,setIndex]=useState(0);
  useEffect(()=>setIndex(0),[query]);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.key==="Escape"){e.preventDefault();onClose();return;}
      if(!["ArrowDown","ArrowUp","Enter"].includes(e.key))return;
      e.preventDefault();e.stopPropagation();
      if(e.key==="ArrowDown")setIndex(i=>(i+1)%Math.max(1,items.length));
      else if(e.key==="ArrowUp")setIndex(i=>(i+items.length-1)%Math.max(1,items.length));
      else if(items[index])onChoose(items[index].id);
    };
    document.addEventListener("keydown",key,true);
    return()=>document.removeEventListener("keydown",key,true);
  },[items,index,onChoose,onClose]);
  return <div className="ux-menu" role="menu">
    {query !== undefined && <div className="menu-search">/ {query || "Search blocks…"}</div>}
    {items.length===0 && <div className="empty-results">No matching blocks</div>}
    {items.map((it,i)=><button key={it.id} type="button" role="menuitem"
      className={(index===i?"is-highlighted ":"")+(it.destructive?"destructive":"")}
      onPointerDown={e=>e.preventDefault()} onMouseEnter={()=>setIndex(i)} onClick={()=>onChoose(it.id)}>
      <span>{it.label}</span>{it.shortcut && <small>{it.shortcut}</small>}
    </button>)}
    <div className="menu-footer">↑ ↓ Navigate · Enter Apply · Esc Close</div>
  </div>;
}
export function PopupMenu({editor,popup,onChoose,onClose}:{
  editor:Editor;popup:Popup;onChoose:(a:Action)=>void;onClose:()=>void;
}) {
  const items=popup.type==="menu" ? actionsFor(popup.block)
    : popup.type==="slash" ? filterInserts(popup.query || "")
    : filterInserts("");
  return <Anchored editor={editor} anchor={popup.anchor} className="menu-wrap">
    <Menu items={items} query={popup.type==="slash" ? popup.query || "" : undefined}
      onChoose={onChoose} onClose={onClose}/>
  </Anchored>;
}
export function DetailPopover({editor,popup,onClose,onComment}:{
  editor:Editor;popup:Popup;onClose:()=>void;onComment:(note:string)=>void;
}) {
  const image=editor.state.doc.nodeAt(popup.pos);
  const isImage=popup.type==="image";
  const [url,setUrl]=useState(isImage ? String(image?.attrs.src || "") : String(editor.getAttributes("link").href || ""));
  const [caption,setCaption]=useState(isImage ? String(image?.attrs.caption || "") : "");
  const [width,setWidth]=useState(isImage ? parseInt(String(image?.attrs.width || "100"),10) || 100 : 100);
  const [note,setNote]=useState("");
  const save=()=>{
    if(isImage) {
      const clean=url.trim();if(!clean)return;
      editor.chain().focus().setNodeSelection(popup.pos).updateAttributes("image",{
        src:clean,caption:caption.trim(),width:String(width)+"%",
      }).run();
    } else if(popup.type==="link") {
      const clean=url.trim(); if(!clean)return;
      const from=popup.from ?? editor.state.selection.from;
      const to=popup.to ?? editor.state.selection.to;
      let chain=editor.chain().focus().setTextSelection({from,to});
      if(editor.isActive("link"))chain=chain.extendMarkRange("link");
      chain.setLink({href:clean}).run();
    } else if(note.trim()) onComment(note.trim());
    onClose();
  };
  return <Anchored editor={editor} anchor={popup.anchor} wide className="detail-panel">
    <div className="detail-heading"><strong>{isImage ? "Image" : popup.type==="link" ? "Edit link" : "Comment"}</strong>
      <button type="button" onClick={onClose} aria-label="Close popover">×</button></div>
    {popup.type==="comment" ? <label>Comment<textarea autoFocus rows={3} value={note} onChange={e=>setNote(e.target.value)}
      placeholder="Leave a note on this block…"/></label>
    : <><label>{isImage ? "Image URL" : "Link URL"}<input autoFocus value={url} onChange={e=>setUrl(e.target.value)}
      onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();save();}}} placeholder="https://…"/></label>
      {isImage && <><label>Caption<input value={caption} onChange={e=>setCaption(e.target.value)}
        placeholder="Describe the image"/></label>
        <label>Width · {width}%<input aria-label="Image width" type="range" min={25} max={100}
          value={width} onChange={e=>setWidth(Number(e.target.value))}/></label></>}
      </>}
    <div className="detail-actions"><button type="button" onClick={onClose}>Cancel</button>
      <button type="button" className="primary" onClick={save}>{popup.type==="comment" ? "Add comment" : "Save"}</button></div>
  </Anchored>;
}
