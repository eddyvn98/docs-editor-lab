export type Kind = "text"|"paragraph"|"heading"|"bulletList"|"orderedList"|"taskList"|"blockquote"|"callout"|"codeBlock"|"horizontalRule"|"image"|"table"|"cell"|"link";
export type Action = "paragraph"|"h1"|"h2"|"h3"|"bullet"|"numbered"|"task"|"quote"|"callout"|"code"|"divider"|"image"|"table"|"duplicate"|"delete"|"insert-below"|"comment"|"copy"|"align-left"|"align-center"|"align-right"|"indent"|"outdent"|"link-edit"|"link-copy"|"link-remove"|"link-open"|"image-edit"|"image-download"|"image-copy"|"row-add"|"row-delete"|"col-add"|"col-delete"|"table-delete";
export type Item = { id: Action; label: string; shortcut?: string; destructive?: boolean };
const I = (id: Action, label: string, shortcut?: string): Item => ({id,label,shortcut,destructive: id === "delete" || id === "table-delete"});
export const insertItems: Item[] = [
  I("paragraph","Text"),I("h1","Heading 1"),I("h2","Heading 2"),I("h3","Heading 3"),
  I("bullet","Bullet list"),I("numbered","Numbered list"),I("task","Checklist"),
  I("quote","Quote"),I("callout","Callout"),I("code","Code block"),
  I("divider","Divider"),I("image","Image"),I("table","Table"),
];
const shared = [I("insert-below","Insert below"),I("duplicate","Duplicate"),I("copy","Copy content"),I("comment","Comment")];
const convert = insertItems.slice(0, 10);
export function actionsFor(kind: Kind): Item[] {
  switch (kind) {
    case "link": return [I("link-open","Open link"),I("link-edit","Edit link"),I("link-copy","Copy URL"),I("link-remove","Remove link")];
    case "table": case "cell": return [I("row-add","Insert row below"),I("row-delete","Delete row"),I("col-add","Insert column right"),I("col-delete","Delete column"),I("align-left","Align left"),I("align-center","Align center"),I("align-right","Align right"),I("copy","Copy"),I("comment","Comment"),I("table-delete","Delete table")];
    case "image": return [I("image-edit","Caption, replace or resize"),I("image-copy","Copy image URL"),I("image-download","Download image"),I("duplicate","Duplicate"),I("insert-below","Insert below"),I("delete","Delete image")];
    case "horizontalRule": return [I("insert-below","Insert below"),I("duplicate","Duplicate"),I("delete","Delete divider")];
    case "codeBlock": return [I("paragraph","Turn into text"),I("copy","Copy code"),I("duplicate","Duplicate"),I("insert-below","Insert below"),I("delete","Delete block")];
    default: return [...convert,
      ...(kind === "heading" || kind === "paragraph" || kind === "text" ? [I("align-left","Align left"),I("align-center","Align center"),I("align-right","Align right")] : []),
      ...(kind === "bulletList" || kind === "orderedList" ? [I("indent","Indent"),I("outdent","Outdent")] : []),
      ...shared,I("delete","Delete block")];
  }
}
export const kindFor = (name: string): Kind => (["paragraph","heading","bulletList","orderedList","taskList","blockquote","callout","codeBlock","horizontalRule","image","table"].includes(name) ? name : "text") as Kind;
export function slashQuery(text: string): string | null { const m = /^\/([a-z0-9 _-]{0,32})$/i.exec(text); return m ? m[1].trim().toLowerCase() : null; }
export const filterInserts = (query: string) => insertItems.filter(i => i.label.toLowerCase().includes(query.toLowerCase()));
export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export function placeOverlay(p: Point, s: Size, v: Size, gap = 8): Point {
  return { x: Math.max(gap,Math.min(p.x,v.width-s.width-gap)), y: Math.max(gap,Math.min(p.y,v.height-s.height-gap)) };
}
