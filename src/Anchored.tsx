import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import type { Anchor } from "./useEditorUX";
import { placeOverlay } from "./logic";

export function Anchored({anchor,editor,children,className = "",wide = false}:{
  anchor: Anchor; editor: Editor; children: ReactNode; className?: string; wide?: boolean;
}) {
  const ref=useRef<HTMLDivElement>(null);
  const [point,setPoint]=useState(anchor.point);
  const refresh=useCallback(() => {
    const el=ref.current;
    if(!el) return;
    let desired=anchor.point;
    if(anchor.mode === "pointer" && anchor.element?.isConnected) {
      const r=anchor.element.getBoundingClientRect();
      desired={x:r.left+(anchor.offset?.x || 0),y:r.top+(anchor.offset?.y || 0)};
    } else if(anchor.mode === "element" && anchor.element?.isConnected) {
      const r=anchor.element.getBoundingClientRect();
      desired={x:r.left,y:r.bottom+8};
    } else if(anchor.mode === "caret") {
      try {const r=editor.view.coordsAtPos(editor.state.selection.from);desired={x:r.left,y:r.bottom+8};} catch { /* deleted node */ }
    } else if(anchor.mode === "selection") {
      const s=window.getSelection();
      if(s?.rangeCount && !s.isCollapsed) {
        const r=s.getRangeAt(0).getBoundingClientRect();
        desired={x:r.left+r.width/2-el.offsetWidth/2,y:r.top-el.offsetHeight-9};
        if(desired.y<8) desired.y=r.bottom+9;
      }
    }
    const next=placeOverlay(desired,{width:el.offsetWidth,height:el.offsetHeight},
      {width:window.innerWidth,height:window.innerHeight});
    setPoint(p => p.x===next.x && p.y===next.y ? p : next);
  },[anchor,editor]);
  useLayoutEffect(() => {
    refresh();
    window.addEventListener("scroll",refresh,true);
    window.addEventListener("resize",refresh);
    const ro=typeof ResizeObserver !== "undefined" ? new ResizeObserver(refresh) : null;
    if(ref.current) ro?.observe(ref.current);
    return () => {window.removeEventListener("scroll",refresh,true);window.removeEventListener("resize",refresh);ro?.disconnect();};
  },[refresh]);
  return <div ref={ref} data-ux-overlay className={"ux-floating "+(wide ? "wide " : "")+className}
    style={{left:point.x,top:point.y}}>{children}</div>;
}
