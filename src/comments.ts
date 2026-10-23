import type {Editor} from "@tiptap/react";
export type Comment={id:string;text:string;excerpt:string;resolved:boolean;createdAt:string};
export type CommentTarget={pos:number;from?:number;to?:number};
const STORE="docs-editor-lab-comments-v1";
export function readComments():Comment[]{
  try{const x:unknown=JSON.parse(localStorage.getItem(STORE)||"[]");return Array.isArray(x)?x as Comment[]:[];}
  catch{return [];}
}
export function persistComments(comments:Comment[]){
  try{localStorage.setItem(STORE,JSON.stringify(comments));}catch{ /* disabled storage */ }
}
export function anchorComment(editor:Editor,target:CommentTarget,id:string):string{
  const node=editor.state.doc.nodeAt(target.pos);
  let from=target.from ?? editor.state.selection.from;
  let to=target.to ?? editor.state.selection.to;
  if(from>=to&&node){
    let anchored=false;
    node.descendants((child,offset)=>{
      if(anchored)return false;
      if(child.isText&&child.text){
        anchored=true;
        from=target.pos+1+offset;to=from+child.text.length;return false;
      }
      return true;
    });
  }
  if(from<to&&to<=editor.state.doc.content.size){
    const excerpt=editor.state.doc.textBetween(from,to," ").slice(0,80);
    editor.chain().focus().setTextSelection({from,to}).setMark("comment",{commentId:id}).run();
    return excerpt;
  }
  return node?.textContent.slice(0,80)||"Block";
}
export function jumpToComment(editor:Editor,id:string):boolean{
  let found:number|undefined;
  editor.state.doc.descendants((node,pos)=>{
    if(node.isText&&node.marks.some(mark=>mark.type.name==="comment"&&mark.attrs.commentId===id)){
      found=pos;return false;
    }
    return true;
  });
  if(found===undefined)return false;
  editor.chain().focus().setTextSelection(found).scrollIntoView().run();
  return true;
}
