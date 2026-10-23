import {Mark,mergeAttributes} from "@tiptap/core";
export const CommentMark=Mark.create({
  name:"comment",inclusive:false,
  addAttributes(){return {
    commentId:{default:null,
      parseHTML:(el:HTMLElement)=>el.getAttribute("data-comment-id"),
      renderHTML:(attrs:{commentId?:string})=>({"data-comment-id":attrs.commentId})},
  };},
  parseHTML(){return [{tag:"span[data-comment-id]"}];},
  renderHTML({HTMLAttributes}){return ["span",mergeAttributes({class:"comment-anchor"},HTMLAttributes),0];},
});
