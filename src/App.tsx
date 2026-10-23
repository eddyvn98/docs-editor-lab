import { useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Action, Kind } from "./logic";
import { extensions, readLocalDocument, STORAGE_KEY } from "./editor";
import { applyBlockAction, insertBlock } from "./actions";
import { useEditorUX } from "./useEditorUX";
import type { Popup } from "./useEditorUX";
import { SelectionToolbar, PopupMenu, DetailPopover } from "./FloatingUI";
import { Gutter } from "./Gutter";
import { DocumentTools } from "./DocumentTools";
import { CommentsPanel } from "./CommentsPanel";
import {anchorComment,readComments,persistComments} from "./comments";
import type {Comment} from "./comments";
import "./comments.css";
import "./color-tools.css";
import "./image-files.css";
import "./columns.css";
import {insertImageFile} from "./imageFiles";
import "./interactions.css";

export default function App() {
  const [revision,setRevision]=useState(0);
  const [comments,setComments]=useState<Comment[]>(readComments);
  useEffect(()=>persistComments(comments),[comments]);
  const [outlineOpen,setOutlineOpen]=useState(true);
  const editor=useEditor({
    extensions, content:readLocalDocument(), immediatelyRender:false,
    onUpdate:({editor:ed})=>{
      setRevision(v=>v+1);
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify(ed.getJSON()));}catch{ /* private mode */ }
    },
  });
  const ux=useEditorUX(editor);
  useEffect(()=>{
    if(!editor)return;
    const shortcut=(event:KeyboardEvent)=>{
      if(!editor.isFocused || !(event.ctrlKey||event.metaKey))return;
      const key=event.key.toLowerCase();
      if(key!=="k" && !(key==="m" && event.shiftKey))return;
      event.preventDefault();
      const selection=editor.state.selection;
      const rect=editor.view.coordsAtPos(selection.from);
      const type=key==="k"?"link":"comment";
      ux.setSelectionAnchor(null);
      ux.setPopup({type,block:type==="link"?"link":"text",pos:selection.$from.depth?selection.$from.before(1):selection.from,
        anchor:{element:null,point:{x:rect.left,y:rect.bottom+6},mode:"caret"},from:selection.from,to:selection.to});
    };
    document.addEventListener("keydown",shortcut);
    return()=>document.removeEventListener("keydown",shortcut);
  },[editor,ux.setPopup,ux.setSelectionAnchor]);
  const outline=useMemo(()=>{
    const entries:{text:string;pos:number;level:number}[]=[];
    editor?.state.doc.descendants((node,pos)=>{
      if(node.type.name==="heading") entries.push({text:node.textContent,pos,level:node.attrs.level as number});
    });
    return entries;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[editor,revision]);
  if(!editor) return <main className="loading">Loading document…</main>;

  const popup=ux.popup;
  const openDetail=(type:"link"|"image"|"comment",source?:Popup)=>{
    const sel=editor.state.selection;
    const anchor=source?.anchor || ux.selectionAnchor || {element:null,point:{x:innerWidth/2,y:120},mode:"selection" as const};
    ux.setSelectionAnchor(null);
    ux.setPopup({type,block:type as Kind,pos:source?.pos ?? (sel.$from.depth ? sel.$from.before(1) : sel.from),
      anchor,from:source?.from ?? sel.from,to:source?.to ?? sel.to});
  };
  const handleAction=(id:Action)=>{
    if(!popup)return;
    if(popup.type==="slash"){
      const node=editor.state.doc.nodeAt(popup.pos);
      if(node && node.type.name==="paragraph"){
        editor.commands.deleteRange({from:popup.pos+1,to:popup.pos+1+node.textContent.length});
      }
    }
    if(id==="comment"){openDetail("comment",popup);return;}
    if(id==="link-edit"){openDetail("link",popup);return;}
    if(id==="image-edit"){openDetail("image",popup);return;}
    if(id==="link-remove"){editor.chain().focus().extendMarkRange("link").unsetLink().run();}
    else if(id==="link-open"){
      const href=String(editor.getAttributes("link").href || "");
      if(/^https?:\/\//i.test(href))window.open(href,"_blank","noopener,noreferrer");
    } else if(id==="link-copy" || id==="image-copy"){
      const value=id==="link-copy" ? String(editor.getAttributes("link").href || "") :
        String(editor.state.doc.nodeAt(popup.pos)?.attrs.src || "");
      if(value)void navigator.clipboard?.writeText(value).catch(()=>{});
    } else if(id==="image-download"){
      const src=String(editor.state.doc.nodeAt(popup.pos)?.attrs.src || "");
      if(src){const a=document.createElement("a");a.href=src;a.download="document-image";a.rel="noopener noreferrer";a.click();}
    } else if(id==="copy"){
      const node=editor.state.doc.nodeAt(popup.pos);
      if(node)void navigator.clipboard?.writeText(node.textContent).catch(()=>{});
    } else {
      if(popup.type==="insert" || popup.type==="slash") insertBlock(editor,id,popup.pos);
      else {
        if(popup.block==="cell" && popup.cellPos != null && !("$anchorCell" in editor.state.selection)) editor.commands.setTextSelection(popup.cellPos);
        applyBlockAction(editor,id,popup.pos,popup.cellPos);
      }
    }
    ux.close();
  };
  const words=editor.state.doc.textContent.trim().split(/\s+/).filter(Boolean).length;
  return <main className="app-shell">
    <header className="topbar">
      <div className="breadcrumbs"><span className="crumb">Workspace</span><span className="slash">/</span><strong>Product planning notes</strong><span className="tag">Lab</span></div>
      <div className="top-actions"><span className="save-state"><span className="save-dot"/> Saved locally</span>
        <DocumentTools editor={editor} revision={revision}/>
        <button aria-label="Undo" title="Undo" onClick={()=>editor.chain().focus().undo().run()}>↶</button>
        <button aria-label="Redo" title="Redo" onClick={()=>editor.chain().focus().redo().run()}>↷</button>
        <button className="outline-toggle" onClick={()=>setOutlineOpen(v=>!v)}>{outlineOpen?"Hide outline":"Outline"}</button>
      </div>
    </header>
    <div className="workspace">
      <section className="page">
        <div className="page-meta"><span className="doc-icon">▤</span> Document <span>·</span> Editable playground</div>
        <h1 className="document-title">Product planning notes</h1>
        <p className="document-hint">Select text, hover a block, or right-click an image or table cell. Your edits stay in this browser.</p>
        <div className="editor-frame" onMouseMove={ux.onMouseMove} onMouseLeave={event=>{if(!(event.relatedTarget instanceof Element && event.relatedTarget.closest("[data-ux-gutter]")))ux.setHover(null);}}
          onContextMenu={ux.onContextMenu} onClick={ux.onClick} onDragOver={event=>{
            if(event.dataTransfer.types.includes("Files"))event.preventDefault();else ux.onDragOver(event);
          }}
          onDrop={event=>{
            const file=Array.from(event.dataTransfer.files).find(f=>f.type.startsWith("image/"));
            if(file){event.preventDefault();const pos=editor.view.posAtCoords({left:event.clientX,top:event.clientY})?.pos;
              void insertImageFile(editor,file,pos).catch(error=>window.alert(String(error)));}
            else ux.onDrop(event);
          }} onPaste={event=>{
            const file=Array.from(event.clipboardData.files).find(f=>f.type.startsWith("image/"));
            if(file){event.preventDefault();void insertImageFile(editor,file).catch(error=>window.alert(String(error)));}
          }} onPointerUp={()=>requestAnimationFrame(ux.trackSelection)}>
          <EditorContent editor={editor}/>
        </div>
        <footer className="page-footer">{words} words <span>·</span> Type / in an empty line to insert</footer>
      </section>
      {outlineOpen && <aside className="outline-panel">
        <div className="outline-title">On this page <button aria-label="Close outline" onClick={()=>setOutlineOpen(false)}>×</button></div>
        <nav aria-label="Document outline">{outline.map(({text,pos,level})=>
          <button key={pos} style={{paddingLeft:(level-1)*12+9}} onClick={()=>{
            editor.chain().focus().setTextSelection(Math.min(pos+1,editor.state.doc.content.size)).scrollIntoView().run();
          }}>{text || "Untitled heading"}</button>)}</nav>
        <div className="outline-help">Tip: drag ⠿ to reorder blocks.</div>
        <CommentsPanel editor={editor} comments={comments} onUpdate={setComments}/>
      </aside>}
    </div>
    <Gutter hover={ux.hover} onInsert={()=>{if(ux.hover)ux.openGutter("insert",ux.hover);}}
      onMenu={()=>{if(ux.hover)ux.openGutter("menu",ux.hover);}}
      onDragStart={event=>{if(ux.hover)ux.onDragStart(event,ux.hover.pos);}}
      onLeave={()=>ux.setHover(null)}/>
    {ux.selectionAnchor && !popup && <SelectionToolbar editor={editor} anchor={ux.selectionAnchor}
      onLink={()=>openDetail("link")} onComment={()=>openDetail("comment")}/>}
    {popup && (popup.type==="menu" || popup.type==="insert" || popup.type==="slash") &&
      <PopupMenu editor={editor} popup={popup} onChoose={handleAction} onClose={ux.close}/>}
    {popup && (popup.type==="link" || popup.type==="image" || popup.type==="comment") &&
      <DetailPopover key={popup.type+":"+popup.pos} editor={editor} popup={popup} onClose={ux.close}
        onComment={text=>{
          const id=crypto.randomUUID();
          const excerpt=anchorComment(editor,popup,id);
          setComments(list=>[...list,{id,text,excerpt,resolved:false,createdAt:new Date().toISOString()}]);
        }}/>}
  </main>;
}
