import {useEffect,useMemo,useRef,useState} from "react";
import type {Editor} from "@tiptap/react";
import type {JSONContent} from "@tiptap/core";
import {findMatches,isDocument,safeFileName} from "./documentUtils";
import "./document-tools.css";
type Version={id:string;at:string;doc:JSONContent};
const STORE="docs-editor-lab-versions-v1";
function readVersions():Version[]{
  try{const x=JSON.parse(localStorage.getItem(STORE)||"[]") as unknown;
    return Array.isArray(x)?x.slice(0,10) as Version[]:[];}catch{return [];}
}
function download(filename:string,content:string,type:string){
  const url=URL.createObjectURL(new Blob([content],{type}));
  const a=document.createElement("a");a.href=url;a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function DocumentTools({editor,revision}:{editor:Editor;revision:number}){
  const [open,setOpen]=useState(false),[query,setQuery]=useState("");
  const [replace,setReplace]=useState(""),[cursor,setCursor]=useState(0);
  const [versions,setVersions]=useState<Version[]>(readVersions);
  const [message,setMessage]=useState("");
  const ref=useRef<HTMLDivElement>(null),fileRef=useRef<HTMLInputElement>(null),findRef=useRef<HTMLInputElement>(null);
  const matches=useMemo(()=>findMatches(editor.state.doc,query),[editor,revision,query]);
  useEffect(()=>setCursor(0),[query]);
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="f"&&editor.isFocused){
        event.preventDefault();setOpen(true);requestAnimationFrame(()=>findRef.current?.focus());
      }
      if(event.key==="Escape"&&open){setOpen(false);editor.commands.focus();}
    };
    const outside=(event:PointerEvent)=>{if(open&&ref.current&&!ref.current.contains(event.target as Node))setOpen(false);};
    document.addEventListener("keydown",key);document.addEventListener("pointerdown",outside);
    return()=>{document.removeEventListener("keydown",key);document.removeEventListener("pointerdown",outside);};
  },[editor,open]);
  const go=(i:number)=>{
    if(!matches.length)return;
    const next=(i+matches.length)%matches.length;setCursor(next);
    editor.chain().focus().setTextSelection(matches[next]).scrollIntoView().run();
  };
  const one=()=>{
    if(!matches.length)return;
    editor.chain().focus().insertContentAt(matches[Math.min(cursor,matches.length-1)],replace).run();
    setMessage("Replaced one match");
  };
  const all=()=>{
    const tr=editor.state.tr;
    for(const m of [...matches].reverse())tr.insertText(replace,m.from,m.to);
    if(tr.docChanged)editor.view.dispatch(tr.scrollIntoView());
    setMessage("Replaced "+matches.length+" matches");
  };
  const save=()=>{
    const next=[{id:crypto.randomUUID(),at:new Date().toLocaleString(),doc:editor.getJSON()},...versions].slice(0,10);
    try{localStorage.setItem(STORE,JSON.stringify(next));setVersions(next);setMessage("Version saved");}
    catch{setMessage("Local storage is unavailable or full");}
  };
  const restore=(v:Version)=>{
    if(!window.confirm("Restore this version? The current content will be replaced."))return;
    editor.commands.setContent(v.doc);setOpen(false);
  };
  const remove=(id:string)=>{
    const next=versions.filter(v=>v.id!==id);setVersions(next);
    try{localStorage.setItem(STORE,JSON.stringify(next));}catch{/* storage unavailable */}
  };
  const importFile=async(file?:File)=>{
    if(!file)return;
    if(file.size>2_000_000){setMessage("File must be below 2 MB");return;}
    try{
      const raw=await file.text();let content:JSONContent|string=raw;
      if(/\.json$/i.test(file.name)){
        const value:unknown=JSON.parse(raw);
        if(!isDocument(value))throw new Error("Invalid TipTap JSON");
        content=value as JSONContent;
      }else if(!/\.html?$/i.test(file.name))throw new Error("Use .json or .html");
      if(!window.confirm("Import and replace the current document?"))return;
      editor.commands.setContent(content);setMessage("Imported "+file.name);
    }catch(e){setMessage(e instanceof Error?e.message:"Import failed");}
    if(fileRef.current)fileRef.current.value="";
  };
  return <div className="document-tools" ref={ref}>
    <button aria-label="Document tools" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>Tools ▾</button>
    {open&&<section className="tools-panel" aria-label="Document tools panel">
      <header><strong>Find & replace</strong><button aria-label="Close tools" onClick={()=>setOpen(false)}>×</button></header>
      <input ref={findRef} aria-label="Find text" placeholder="Find in document…" value={query} onChange={e=>setQuery(e.target.value)}/>
      <div className="tools-row"><small>{matches.length} matches</small>
        <button aria-label="Previous match" disabled={!matches.length} onClick={()=>go(cursor-1)}>↑</button>
        <button aria-label="Next match" disabled={!matches.length} onClick={()=>go(cursor+1)}>↓</button></div>
      <input aria-label="Replace with" placeholder="Replace with…" value={replace} onChange={e=>setReplace(e.target.value)}/>
      <div className="tools-row"><button disabled={!matches.length} onClick={one}>Replace</button>
        <button disabled={!matches.length} onClick={all}>Replace all</button></div>
      <hr/><strong>Import & export</strong>
      <div className="tools-row wrap">
        <button onClick={()=>download(safeFileName("Product planning notes")+".html",editor.getHTML(),"text/html")}>HTML</button>
        <button onClick={()=>download(safeFileName("Product planning notes")+".json",JSON.stringify(editor.getJSON(),null,2),"application/json")}>JSON</button>
        <button onClick={()=>window.print()}>Print / PDF</button>
        <button onClick={()=>fileRef.current?.click()}>Import…</button>
      </div>
      <input ref={fileRef} type="file" hidden accept=".json,.html,.htm"
        onChange={e=>{void importFile(e.target.files?.[0]);}}/>
      <hr/><div className="tools-row"><strong>Local versions</strong><button onClick={save}>Save version</button></div>
      {versions.length===0&&<small>No saved versions yet</small>}
      <div className="version-list">{versions.map(v=><div key={v.id} className="version">
        <small>{v.at}</small><button onClick={()=>restore(v)}>Restore</button>
        <button aria-label={"Delete version "+v.at} onClick={()=>remove(v.id)}>×</button></div>)}</div>
      {message&&<p className="tools-message" role="status">{message}</p>}
    </section>}
  </div>;
}
