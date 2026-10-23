import { Node, mergeAttributes } from "@tiptap/core";
import {useState} from "react";
import type {PointerEvent as ReactPointerEvent} from "react";
import type { JSONContent } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import {CommentMark} from "./CommentMark";
import {Column,Columns} from "./Columns";
import { TextStyleKit } from "@tiptap/extension-text-style";

function ImageFigure({node,selected,updateAttributes}:NodeViewProps){
  const a=node.attrs as {src:string;alt?:string;width?:string;caption?:string};
  const [preview,setPreview]=useState<number|null>(null);
  const start=(event:ReactPointerEvent<HTMLButtonElement>)=>{
    event.preventDefault();event.stopPropagation();
    const figure=(event.currentTarget.closest(".image-figure") as HTMLElement|null);
    const img=figure?.querySelector<HTMLImageElement>(".image-shell img");
    const parent=figure?.getBoundingClientRect();
    if(!img||!parent)return;
    const initial=img.getBoundingClientRect().width, x=event.clientX;
    let value=Math.round(100*initial/parent.width);
    const move=(e:PointerEvent)=>{
      value=Math.min(100,Math.max(25,Math.round(100*(initial+e.clientX-x)/parent.width)));
      setPreview(value);
    };
    const done=()=>{
      window.removeEventListener("pointermove",move);
      window.removeEventListener("pointerup",done);
      window.removeEventListener("pointercancel",cancel);
      updateAttributes({width:value+"%"});setPreview(null);
    };
    const cancel=()=>{
      window.removeEventListener("pointermove",move);
      window.removeEventListener("pointerup",done);
      window.removeEventListener("pointercancel",cancel);
      setPreview(null);
    };
    window.addEventListener("pointermove",move);
    window.addEventListener("pointerup",done);
    window.addEventListener("pointercancel",cancel);
  };
  return <NodeViewWrapper as="figure" className={"image-figure"+(selected?" is-selected":"")}>
    <div className="image-shell" style={{width:preview===null?a.width||"100%":preview+"%"}}>
      <img src={a.src} alt={a.alt||"Document image"} draggable={false}/>
      <button type="button" contentEditable={false} className="resize-image" aria-label="Resize image"
        title="Drag to resize image" onPointerDown={start} onClick={e=>e.stopPropagation()}>↘</button>
    </div>
    <figcaption contentEditable={false}>{a.caption||"Click to add a caption"}</figcaption>
  </NodeViewWrapper>;
}
const DocumentImage = Image.extend({
  addAttributes() {
    return {...this.parent?.(),
      width: { default:"100%", parseHTML: (el: HTMLElement) => el.getAttribute("data-width") || "100%", renderHTML: (a: {width: string}) => ({"data-width":a.width}) },
      caption: { default:"", parseHTML: (el: HTMLElement) => el.getAttribute("data-caption") || "", renderHTML: (a: {caption: string}) => ({"data-caption":a.caption}) },
    };
  },
  addNodeView() { return ReactNodeViewRenderer(ImageFigure); },
});
const Callout = Node.create({
  name:"callout", group:"block", content:"block+", defining:true,
  parseHTML() {return [{tag:'aside[data-type="callout"]'}];},
  renderHTML({HTMLAttributes}) {return ["aside",mergeAttributes({"data-type":"callout",class:"callout"},HTMLAttributes),0];},
});
export const extensions = [
  StarterKit.configure({heading:{levels:[1,2,3]},link:false}),
  Link.configure({openOnClick:false,autolink:true}),
  DocumentImage.configure({inline:false}),
  Callout,
  TableKit.configure({table:{resizable:true}}),
  TaskList, TaskItem.configure({nested:true}),
  TextAlign.configure({types:["paragraph","heading"]}),
  Highlight.configure({multicolor:true}),
  TextStyleKit,
  CommentMark,
  Column,Columns,
];
export const starterContent = [
  '<h1>Product planning notes</h1>',
  '<p>Select this sentence to explore the contextual text toolbar. Right-click a block for relevant actions.</p>',
  '<h2>What matters today?</h2>',
  '<p>Keep editing close to the content. <a href="https://www.larksuite.com/hc/en-US/articles/608015471697-use-blocks-in-docs">Read about blocks ↗</a></p>',
  '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked><span></span></label><div><p>Review interactions</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Try right-click and dragging</p></div></li></ul>',
  '<aside data-type="callout"><p>💡 Hover beside a block. On an empty line, press + or type / to insert.</p></aside>',
  '<h2>Reference moodboard</h2><p>Images have their own caption and size controls.</p>',
  '<img src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1100&amp;q=85" alt="Mountain lake" data-caption="Moodboard · a calm workspace" data-width="85%">',
  '<blockquote><p>Great editing feels like working on the page, not managing the app.</p></blockquote>',
  '<pre><code>const editing = { focused: true, friction: "low" };</code></pre>',
  '<table><tbody><tr><th><p>Interaction</p></th><th><p>Target</p></th><th><p>Status</p></th></tr><tr><td><p>Selection toolbar</p></td><td><p>Text</p></td><td><p>Try it</p></td></tr><tr><td><p>Context actions</p></td><td><p>Cell / block</p></td><td><p>Try it</p></td></tr></tbody></table>',
  '<div data-type="columns"><div data-type="column"><p>Explore ideas side by side</p></div><div data-type="column"><p>Compare without another table</p></div></div>',
  '<hr><h2>Quick thoughts</h2><p></p>',
].join("");
export const STORAGE_KEY = "docs-editor-lab-v1";
export function readLocalDocument(): string | JSONContent {
  try { const raw = localStorage.getItem(STORAGE_KEY); if(raw) return JSON.parse(raw) as JSONContent; } catch { /* storage disabled */ }
  return starterContent;
}
