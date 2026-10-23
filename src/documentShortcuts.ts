import type { Editor } from '@tiptap/react';
import type { Popup } from './targets';
import { Selection } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';
import { DOCUMENT_TEMPLATES } from './features/templates';
export const shortcutTemplateId=(id:string)=>id==='template-weekly'?'weekly':id.startsWith('template-')?id.slice(9):'';
/** Insert a complete template in one document transaction; no placeholder or loading node. */
export function insertDocumentShortcut(editor:Editor,id:string,afterPos?:number,slash?:Popup):boolean{
  if(!editor.isEditable)return false;
  const selected=DOCUMENT_TEMPLATES.find(template=>template.id===shortcutTemplateId(id));
  if(!selected)return false;
  try {
    const nodes=selected.content.map(json=>editor.schema.nodeFromJSON(json));
    nodes.forEach(n=>n.check());
    const doc=editor.state.doc;
    let tr=closeHistory(editor.state.tr);
    let at=doc.content.size;
    if(slash?.command){
      const c=slash.command, origin=doc.nodeAt(slash.pos);
      if(!origin?.isTextblock||!origin.textBetween(c.from-slash.pos-1,c.to-slash.pos-1).startsWith('/'))return false;
      tr.delete(c.from,c.to);
      const updated=tr.doc.nodeAt(slash.pos);
      if(!updated)return false;
      at=slash.pos+updated.nodeSize;
    } else if(afterPos!==undefined){
      const previous=doc.nodeAt(afterPos);
      if(!previous)return false;
      at=afterPos+previous.nodeSize;
    }
    tr.insert(at,nodes);
    tr.doc.check();
    tr.setSelection(Selection.near(tr.doc.resolve(Math.min(at+1,tr.doc.content.size))));
    editor.view.dispatch(tr.scrollIntoView());editor.view.focus();return true;
  }catch{return false;}
}
