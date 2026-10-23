import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import { Modal } from './Modal';
import { searchTemplates } from './templates';
import type { DocumentTemplate } from './templates';
import { insertFeatureBlocks } from './featureCommands';
type Tab = 'Recommended' | 'My templates' | 'Shared with me';
const previewText=(node:JSONContent):string=>{
  if(node.text) return node.text;
  return (node.content||[]).map(previewText).filter(Boolean).join(node.type==='tableRow'?' | ':' ');
};
export function TemplateGallery({editor,onClose}:{editor:Editor;onClose:()=>void}) {
  const [tab,setTab]=useState<Tab>('Recommended'), [query,setQuery]=useState(''), [category,setCategory]=useState('All');
  const [chosen,setChosen]=useState('meeting'), [preview,setPreview]=useState(false), [error,setError]=useState('');
  const choices=tab==='Recommended'?searchTemplates(query,category):[];
  const current=choices.find(item=>item.id===chosen)||choices[0];
  const allIndex=current?choices.findIndex(t=>t.id===current.id):0;
  const select=(template:DocumentTemplate)=>{setChosen(template.id);setPreview(true);};
  const insert=()=>{
    if(!current) return;
    try {
      if(!insertFeatureBlocks(editor,current.content,true)) throw new Error('Return to editing mode to insert a template.');
      onClose();
    } catch(e){setError(e instanceof Error?e.message:'Unable to insert template.');}
  };
  return <Modal title="Template gallery" onClose={onClose} className="template-gallery">
    <p>Preview a template before inserting it. One insertion = one Undo; your existing document is preserved.</p>
    <div className="template-gallery-tabs" role="tablist" aria-label="Template sources">
      {(['Recommended','My templates','Shared with me'] as Tab[]).map(value=>
        <button type="button" key={value} role="tab" aria-selected={tab===value} aria-pressed={tab===value}
          onClick={()=>{setTab(value);setPreview(false);}}>{value}</button>)}
    </div>
    {tab==='Recommended'?<>
      <input aria-label="Search templates" autoFocus placeholder="Search templates..." value={query}
        onChange={e=>{setQuery(e.target.value);setPreview(false);}}/>
      <div className="template-categories" role="group" aria-label="Template categories">
        {['All','Meetings','Planning','Updates'].map(value=><button type="button" key={value}
          aria-pressed={category===value} onClick={()=>{setCategory(value);setPreview(false);}}>{value}</button>)}
      </div>
      <div className="template-grid">{choices.map(item=><button type="button" key={item.id} className="template-card"
        aria-pressed={current?.id===item.id} onClick={()=>select(item)}>
        <span className="template-mini-page" aria-hidden="true"><b/><i/><i/><i/></span>
        <strong>{item.name}</strong><span>{item.description}</span><small>{item.category}</small>
      </button>)}</div>
      {!choices.length&&<p role="status" className="template-empty">No templates match your search.</p>}
      {current&&<section aria-label="Template preview" className="template-preview-content">
        <strong>Preview: {current.name}</strong>
        {current.content.map((node,i)=>{
          const value=previewText(node);
          return node.type==='heading'?<h3 key={i}>{value}</h3>:
            node.type==='table'?<table key={i}><tbody>{(node.content||[]).map((row,r)=><tr key={r}>
              {(row.content||[]).map((cell,c)=><td key={c}>{previewText(cell)||'—'}</td>)}</tr>)}</tbody></table>:
            <p key={i}>{value||'Editable section'}</p>;
        })}
      </section>}
      {preview&&current&&<div role="group" aria-label="Preview navigation">
        <button disabled={allIndex===0} onClick={()=>{setChosen(choices[allIndex-1].id);}}>Previous preview</button>
        <span> {allIndex+1} / {choices.length} </span>
        <button disabled={allIndex===choices.length-1} onClick={()=>{setChosen(choices[allIndex+1].id);}}>Next preview</button>
      </div>}
    </>:<div className="template-empty" role="status">
      <strong>{tab==='My templates'?'No personal document templates yet.':'No shared templates available in this local lab.'}</strong>
      <p>{tab==='My templates'?'Create reusable block templates from a block context menu.':'Shared templates require an authenticated sharing service.'}</p>
      {tab==='Shared with me'&&<button type="button" onClick={()=>setTab('Recommended')}>Use This Template — browse recommended</button>}
    </div>}
    {error&&<p role="alert" className="feature-error">{error}</p>}
    <footer className="feature-dialog-actions"><button type="button" onClick={onClose}>Cancel</button>
      <button type="button" className="primary" disabled={!current||tab!=='Recommended'} onClick={insert}>
        Insert {current?.name||'template'}</button></footer>
  </Modal>;
}