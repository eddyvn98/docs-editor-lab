import { useEffect, useState } from "react";
import type { DragEvent } from "react";
import type { Hover } from "./useEditorUX";
export function Gutter({hover,onMenu,onInsert,onDragStart,onLeave}:{
  hover:Hover|null;onMenu:()=>void;onInsert:()=>void;onDragStart:(event:DragEvent<HTMLElement>)=>void;onLeave?:()=>void;
}) {
  const [point,setPoint]=useState({left:-100,top:-100});
  useEffect(() => {
    if(!hover) return;
    const refresh=()=>{
      const r=hover.element.getBoundingClientRect();
      setPoint({left:r.left-56,top:r.top+Math.min(8,Math.max(0,r.height-30))});
    };
    refresh();window.addEventListener("scroll",refresh,true);window.addEventListener("resize",refresh);
    return()=>{window.removeEventListener("scroll",refresh,true);window.removeEventListener("resize",refresh);};
  },[hover]);
  if(!hover) return null;
  return <div className="ux-gutter" data-ux-gutter style={point} onMouseLeave={onLeave}>
    {hover.empty && <button title="Add block" aria-label="Add block" onPointerDown={e=>e.preventDefault()} onClick={onInsert}>+</button>}
    <span role="button" tabIndex={0} draggable aria-label="Drag or open block actions" title="Drag to reorder · click for actions"
      onDragStart={onDragStart} onPointerDown={e=>e.preventDefault()} onClick={onMenu}
      onKeyDown={e=>{if(e.key==="Enter" || e.key===" "){e.preventDefault();onMenu();}}}>⠿</span>
  </div>;
}
