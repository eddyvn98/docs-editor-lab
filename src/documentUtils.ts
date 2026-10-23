export type Match = {from:number;to:number};
export type SearchDoc = {descendants:(fn:(node:{isText?:boolean;text?:string|null},pos:number)=>void)=>void};
export function findMatches(doc:SearchDoc,term:string):Match[]{
  const q=term.trim().toLowerCase();if(!q)return [];
  const all:Match[]=[];
  doc.descendants((node,pos)=>{
    if(!node.isText||!node.text)return;
    const text=node.text.toLowerCase();let at=0;
    while((at=text.indexOf(q,at))!==-1){all.push({from:pos+at,to:pos+at+q.length});at+=q.length;}
  });
  return all;
}
export function isDocument(value:unknown):value is {type:"doc";content?:unknown[]}{
  if(!value||typeof value!=="object")return false;
  const doc=value as Record<string,unknown>;
  return doc.type==="doc"&&(doc.content===undefined||Array.isArray(doc.content));
}
export function safeFileName(name:string):string{
  return name.replace(/[^\p{L}\p{N} _.-]/gu,"").trim().replace(/\s+/g,"-").slice(0,70)||"document";
}
