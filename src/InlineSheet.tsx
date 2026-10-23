import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useMemo, useState } from 'react';
import {emptySheet,normalizeSheet,sheetUpdate,sheetReplace} from './sheetModel';
import type {SheetData} from './sheetModel';
function SheetView({ node, editor, updateAttributes }: NodeViewProps) {
  const sheet = normalizeSheet(node.attrs.sheet);
  const [selected,setSelected] = useState<[number,number]>([0,0]);
  const [search,setSearch] = useState(''), [replace,setReplace] = useState('');
  const [expanded,setExpanded] = useState(false), [showFind,setShowFind] = useState(false);
  const [link,setLink] = useState(false), [filterText,setFilterText] = useState('');
  const commit = (next: SheetData) => { if(editor.isEditable) updateAttributes({ sheet: next }); };
  const change = (r:number,c:number,value:string) => commit(sheetUpdate(sheet,r,c,value));
  const addRow = () => commit({...sheet,cells:[...sheet.cells,Array(sheet.cells[0].length).fill('')]});
  const addCol = () => commit({...sheet,cells:sheet.cells.map(row=>[...row,''])});
  const merge = () => { const [r,c]=selected,key=r+':'+c;
    if(c+1>=sheet.cells[0].length) return;
    commit({...sheet,merges:sheet.merges.includes(key)?sheet.merges.filter(x=>x!==key):[...sheet.merges,key]});
  };
  const hits = useMemo(()=>sheet.cells.flat().filter(value=>search&&value.toLowerCase().includes(search.toLowerCase())).length,[sheet.cells,search]);
  const replaceAll=()=>commit(sheetReplace(sheet,search,replace));
  return <NodeViewWrapper as="section" className={'inline-sheet'+(expanded?' sheet-expanded':'')} data-type="inline-sheet" data-block-id={node.attrs.blockId} contentEditable={false}>
    <div className="sheet-tools" role="toolbar" aria-label="Inline sheet toolbar">
      <strong>Sheets</strong><span>{sheet.cells[0].length} columns × {sheet.cells.length} rows</span>
      <button type="button" disabled={!editor.isEditable || sheet.cells.length>=100} onClick={addRow}>+ Row</button>
      <button type="button" disabled={!editor.isEditable || sheet.cells[0].length>=26} onClick={addCol}>+ Column</button>
      <button type="button" aria-label="Bold cell" disabled={!editor.isEditable} onClick={()=>{
        const key=selected.join(':');commit({...sheet,styles:{...sheet.styles,[key]:{...sheet.styles[key],bold:!sheet.styles[key]?.bold}}});
      }}>Bold</button>
      <label>Cell color <input type="color" aria-label="Cell text color" disabled={!editor.isEditable}
        value={sheet.styles[selected.join(':')]?.color||'#293448'} onChange={e=>{
          const key=selected.join(':');commit({...sheet,styles:{...sheet.styles,[key]:{...sheet.styles[key],color:e.target.value}}});
        }}/></label>
      <button type="button" disabled={!editor.isEditable} onClick={merge} aria-pressed={sheet.merges.includes(selected.join(':'))}>Merge right</button>
      <button type="button" disabled={!editor.isEditable} aria-pressed={sheet.frozen} onClick={()=>commit({...sheet,frozen:!sheet.frozen})}>Freeze header</button>
      <button type="button" disabled={!editor.isEditable} aria-pressed={sheet.filter} onClick={()=>commit({...sheet,filter:!sheet.filter})}>Filter</button>
      <button type="button" onClick={()=>setShowFind(x=>!x)}>Find/replace</button>
      <button type="button" disabled={!editor.isEditable} onClick={()=>setLink(x=>!x)}>Link</button>
      <button type="button" onClick={()=>setExpanded(x=>!x)}>{expanded?'Exit full screen':'Full screen'}</button>
    </div>
    {showFind && <div className="sheet-find"><input aria-label="Find cells" value={search} onChange={e=>setSearch(e.target.value)}/>
      <input aria-label="Replace cells" value={replace} onChange={e=>setReplace(e.target.value)}/>
      <button disabled={!editor.isEditable||!search} onClick={replaceAll}>Replace all</button><span role="status">{hits} matches</span></div>}
    {link && <div className="sheet-find"><span>Enter an HTTPS URL into the selected cell</span><input aria-label="Cell link URL" placeholder="https://..." onKeyDown={e=>{
      if(e.key==='Enter'){ e.preventDefault();try {const url=new URL(e.currentTarget.value); if(url.protocol==='https:'||url.protocol==='http:') change(...selected,url.href);}catch{/* Do not insert malformed URLs. */}setLink(false);}
    }}/></div>}
    {sheet.filter&&<div className="sheet-find"><label>Filter rows <input aria-label="Filter sheet rows"
      value={filterText} onChange={e=>setFilterText(e.target.value)} placeholder="Filter matching rows"/></label></div>}
    <div className="sheet-scroll"><table aria-label="Editable inline sheet"><tbody>{sheet.cells.map((row,r)=><tr key={r} hidden={sheet.filter&&r>0&&!!filterText&&!row.some(text=>text.toLowerCase().includes(filterText.toLowerCase()))}>
      {row.map((cell,c)=> { if(c>0&&sheet.merges.includes(r+':'+(c-1))) return null;
        const key=r+':'+c, merged=sheet.merges.includes(key);
        return <td key={c} colSpan={merged?2:1} style={{fontWeight:sheet.styles[key]?.bold?700:undefined,color:sheet.styles[key]?.color}} className={(sheet.frozen&&r===0?'sheet-frozen ':'')+(selected[0]===r&&selected[1]===c?'sheet-selected':'')}>
          <input aria-label={'Cell '+(r+1)+','+(c+1)} value={cell} readOnly={!editor.isEditable}
            onFocus={()=>setSelected([r,c])} onChange={e=>change(r,c,e.target.value)}
            onKeyDown={e=> { if(e.key==='Escape') {e.currentTarget.blur();editor.commands.focus();} }}/></td>;
      })}</tr>)}</tbody></table></div>
    <small>Local editable spreadsheet · changes belong to the document and support Undo.</small>
  </NodeViewWrapper>;
}
export const InlineSheet=Node.create({
  name:'inlineSheet', group:'block', atom:true, selectable:true, draggable:true,
  addAttributes(){return {sheet:{default:emptySheet(),parseHTML:el=>{try{return normalizeSheet(JSON.parse(el.getAttribute('data-sheet')||'{}'));}catch{return emptySheet();}},
    renderHTML:attrs=>({'data-sheet':JSON.stringify(normalizeSheet(attrs.sheet))})}};},
  parseHTML(){return [{tag:'section[data-type="inline-sheet"]'}];},
  renderHTML({HTMLAttributes}){return ['section',mergeAttributes(HTMLAttributes,{'data-type':'inline-sheet'}),'Editable spreadsheet'];},
  addNodeView(){return ReactNodeViewRenderer(SheetView);}
});