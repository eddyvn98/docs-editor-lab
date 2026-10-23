import {Node,mergeAttributes} from "@tiptap/core";
export const Column=Node.create({
  name:"column",content:"block+",isolating:true,
  parseHTML(){return [{tag:'div[data-type="column"]'}];},
  renderHTML({HTMLAttributes}){return ["div",mergeAttributes({"data-type":"column",class:"doc-column"},HTMLAttributes),0];},
});
export const Columns=Node.create({
  name:"columns",group:"block",content:"column{2,3}",isolating:true,defining:true,
  parseHTML(){return [{tag:'div[data-type="columns"]'}];},
  renderHTML({HTMLAttributes}){return ["div",mergeAttributes({"data-type":"columns",class:"doc-columns"},HTMLAttributes),0];},
});
