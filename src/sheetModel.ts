export type SheetData={cells:string[][];frozen:boolean;filter:boolean;merges:string[];styles:Record<string,{bold?:boolean;color?:string}>};
export const emptySheet=():SheetData=>({cells:[['','',''],['','','']],frozen:false,filter:false,merges:[],styles:{}});
export function normalizeSheet(value:unknown):SheetData{
  const v=value&&typeof value==='object'?value as Partial<SheetData>:{};
  const cells=Array.isArray(v.cells)&&v.cells.length?v.cells.slice(0,100).map(row=>
    Array.isArray(row)?row.slice(0,26).map(cell=>String(cell??'').slice(0,2000)):[]):emptySheet().cells;
  const width=Math.max(1,Math.min(26,...cells.map(row=>row.length)));
  const styles:SheetData['styles']={};
  if(v.styles&&typeof v.styles==='object'){
    for(const [key,style] of Object.entries(v.styles).slice(0,2600)){
      if(!/^\d+:\d+$/.test(key)||!style||typeof style!=='object')continue;
      const input=style as {bold?:unknown;color?:unknown};
      styles[key]={bold:input.bold===true,color:typeof input.color==='string'&&/^#[0-9a-f]{6}$/i.test(input.color)?input.color:undefined};
    }
  }
  return {cells:cells.map(row=>Array.from({length:width},(_,i)=>row[i]||'')),frozen:v.frozen===true,filter:v.filter===true,
    merges:Array.isArray(v.merges)?v.merges.filter((key):key is string=>typeof key==='string'&&/^\d+:\d+$/.test(key)).slice(0,2600):[],styles};
}
export function sheetUpdate(data:SheetData,row:number,col:number,text:string):SheetData{
  if(row<0||row>=data.cells.length||col<0||col>=data.cells[0].length)return data;
  return {...data,cells:data.cells.map((cells,i)=>cells.map((old,j)=>i===row&&j===col?text.slice(0,2000):old))};
}
export function sheetReplace(data:SheetData,search:string,replace:string):SheetData{
  if(!search)return data;
  return {...data,cells:data.cells.map(row=>row.map(text=>text.split(search).join(replace.slice(0,2000)).slice(0,2000)))};
}
