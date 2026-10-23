import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useEffect, useState } from 'react';
function Visual({node,editor,updateAttributes}:NodeViewProps){
  const name=node.type.name, editable=editor.isEditable;
  const [,refresh]=useState(0);
  useEffect(()=>{const updated=()=>refresh(x=>x+1);editor.on('transaction',updated);return ()=>{editor.off('transaction',updated);};},[editor]);
  const [draft,setDraft]=useState(String(node.attrs.source||''));
  const headings:{text:string;pos:number;level:number}[]=[];
  editor.state.doc.descendants((child,pos)=>{if(child.type.name==='heading') headings.push({text:child.textContent||'Untitled heading',pos,level:child.attrs.level||1});});
  const timeline=String(node.attrs.source||'').split('\n').map(v=>v.trim()).filter(Boolean);
  return <NodeViewWrapper as="section" data-type={name} data-block-id={node.attrs.blockId} className="docs-visual" contentEditable={false}>
    <header><strong>{name==='docsToc'?'Table of contents':name==='docsTimeline'?'Timeline':'Mermaid diagram'}</strong>
      {name!=='docsToc'&&editable&&<button onClick={()=>updateAttributes({source:draft})}>Apply</button>}</header>
    {name==='docsToc'? <nav aria-label="Table of contents">{headings.length?headings.map((h,i)=><button
      key={i} style={{paddingLeft:(h.level-1)*16+8}} onClick={()=>editor.chain().focus().setTextSelection(h.pos+1).scrollIntoView().run()}>{h.text}</button>)
      :<p>Add document headings to populate the table of contents.</p>}</nav>:
    <><label>Source<textarea aria-label={name==='docsTimeline'?'Timeline items':'Mermaid source'} rows={4} value={draft}
      readOnly={!editable} onChange={e=>setDraft(e.target.value)}/></label>
      {name==='docsTimeline'? <ol>{timeline.length?timeline.map((line,i)=><li key={i}>{line}</li>):<li>Add an event above.</li>}</ol>:
        <div aria-label="Diagram preview" className="mermaid-readable">{(draft||'graph TD\n  A[Start] --> B[Next step]').split('\n')
          .filter(line=>line.includes('-->')).map((line,i)=>{
            const parts=line.split('-->').map(s=>s.trim().replace(/^[\w-]+\[/,'').replace(/\].*$/,''));
            return <div key={i}><span>{parts[0]||'Start'}</span> <b aria-label="leads to">→</b> <span>{parts[1]||'Next'}</span></div>;
          })}<pre>{draft}</pre></div>}
      <small>{name==='docsTimeline'?'One event per line; content is editable and persisted.':
        'Diagram source is always visible; no blank or infinite-loading plugin frame.'}</small></>}
  </NodeViewWrapper>;
}
function createVisual(name:string,source:string){
  return Node.create({name,group:'block',atom:true,selectable:true,draggable:true,
    addAttributes(){return {source:{default:source,parseHTML:el=>el.getAttribute('data-source')||source,
      renderHTML:attrs=>({'data-source':String(attrs.source||'')})}};},
    parseHTML(){return [{tag:'section[data-type="'+name+'"]'}];},
    renderHTML({HTMLAttributes}){return ['section',mergeAttributes(HTMLAttributes,{'data-type':name}),name];},
    addNodeView(){return ReactNodeViewRenderer(Visual);}});
}
export const DocsToc=createVisual('docsToc','');
export const DocsTimeline=createVisual('docsTimeline','Kickoff | Owner | Date\nReview | Owner | Date\nDelivery | Owner | Date');
export const DocsMermaid=createVisual('docsMermaid','graph TD\n  A[Start] --> B[Next step]');
