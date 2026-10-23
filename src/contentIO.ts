import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { safeImage, safeLink, escapeHTML, clampImageWidth } from "./safety";
import { isDocument } from "./documentUtils";

export function validateDocument(value: unknown, editor: Pick<Editor, "schema">): JSONContent {
  if (!isDocument(value)) throw new Error("This file is not a TipTap document.");
  let count = 0;
  function visit(item: unknown, depth: number): void {
    if (depth > 60 || ++count > 30000) throw new Error("Document is too complex to import safely.");
    if (!item || typeof item !== "object") throw new Error("Invalid document node.");
    const node = item as JSONContent;
    if (typeof node.type !== "string" || !editor.schema.nodes[node.type]) throw new Error("Unsupported node type.");
    if (node.type === "image" && !safeImage(String(node.attrs?.src || ""))) throw new Error("Unsafe image URL.");
    if (node.marks) {
      if (!Array.isArray(node.marks)) throw new Error("Invalid marks.");
      for (const mark of node.marks) {
        if (!editor.schema.marks[mark.type]) throw new Error("Unsupported text mark.");
        if (mark.type === "link" && !safeLink(String(mark.attrs?.href || ""))) throw new Error("Unsafe link URL.");
      }
    }
    if (node.content !== undefined) {
      if (!Array.isArray(node.content)) throw new Error("Invalid node content.");
      node.content.forEach(child => visit(child, depth + 1));
    }
  }
  visit(value, 0);
  const node = editor.schema.nodeFromJSON(value);
  node.check();
  return node.toJSON() as JSONContent;
}
export function sanitizeHTML(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed,form,base,meta,link").forEach(el => el.remove());
  doc.body.querySelectorAll("*").forEach(el => {
    for (const attribute of Array.from(el.attributes)) {
      if (/^on/i.test(attribute.name) || ["srcdoc", "srcset", "formaction"].includes(attribute.name)) el.removeAttribute(attribute.name);
    }
    if (el.hasAttribute("href") && !safeLink(el.getAttribute("href")!)) el.removeAttribute("href");
    if (el.hasAttribute("src") && !safeImage(el.getAttribute("src")!)) el.removeAttribute("src");
    if (el.hasAttribute("data-width")) el.setAttribute("data-width", clampImageWidth(el.getAttribute("data-width")));
    // Keep schema-supported inline formatting; drop URL-bearing CSS.
    if (/url\s*\(|expression\s*\(/i.test(el.getAttribute("style") || "")) el.removeAttribute("style");
  });
  return doc.body.innerHTML;
}
export function exportHTML(editor: Editor, title: string): string {
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
    `<title>${escapeHTML(title)}</title><style>body{max-width:860px;margin:40px auto;padding:20px;font:16px/1.7 system-ui}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:8px}pre{white-space:pre-wrap;background:#eee;padding:16px}blockquote{border-left:3px solid #aaa;padding-left:16px}[data-type=columns]{display:flex;gap:20px}[data-type=column]{flex:1;min-width:0}@media(max-width:600px){[data-type=columns]{display:block}}</style>` +
    `</head><body><h1>${escapeHTML(title)}</h1>${sanitizeHTML(editor.getHTML())}</body></html>`;
}
