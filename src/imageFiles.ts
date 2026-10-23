import type {Editor} from "@tiptap/react";
const allowed=new Set(["image/png","image/jpeg","image/webp","image/gif"]);
const MAX_SIZE=1_500_000;
export function imageToDataUrl(file:File):Promise<string>{
  if(!allowed.has(file.type))return Promise.reject(new Error("Use a PNG, JPEG, WebP or GIF image"));
  if(file.size>MAX_SIZE)return Promise.reject(new Error("Image exceeds the 1.5 MB local storage limit"));
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>typeof reader.result==="string"?resolve(reader.result):reject(new Error("Invalid image data"));
    reader.onerror=()=>reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}
export async function insertImageFile(editor:Editor,file:File,position?:number){
  const src=await imageToDataUrl(file);
  const content={type:"image",attrs:{src,alt:file.name,width:"80%",caption:file.name}};
  if(typeof position==="number")editor.chain().focus().insertContentAt(position,content).run();
  else editor.chain().focus().insertContent(content).run();
}
