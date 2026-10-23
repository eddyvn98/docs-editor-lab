export type Kind = "text" | "paragraph" | "heading" | "bulletList" | "orderedList" | "taskList" |
  "blockquote" | "callout" | "codeBlock" | "horizontalRule" | "image" | "table" | "cell" | "link" | "columns" | "taskItem";
export type Action = "paragraph" | "h1" | "h2" | "h3" | "bullet" | "numbered" | "task" | "quote" | "callout" |
  "code" | "divider" | "image" | "table" | "columns" | "duplicate" | "delete" | "insert-below" | "comment" | "copy" |
  "align-left" | "align-center" | "align-right" | "indent" | "outdent" | "link-edit" | "link-copy" | "link-remove" |
  "link-open" | "image-edit" | "image-download" | "image-copy" | "row-add" | "row-delete" | "col-add" | "col-delete" |
  "table-delete" | "merge-cells" | "split-cell" | "header-row" | "header-column" | "header-cell" | "row-before" |
  "col-before" | "toggle-task" | "block-link" | "move-up" | "move-down";
export type Item = { id: Action; label: string; shortcut?: string; destructive?: boolean };
const I = (id: Action, label: string): Item => ({ id, label, destructive: ["delete", "table-delete", "row-delete", "col-delete"].includes(id) });
export const insertItems: Item[] = [
  I("paragraph", "Text"), I("h1", "Heading 1"), I("h2", "Heading 2"), I("h3", "Heading 3"),
  I("bullet", "Bullet list"), I("numbered", "Numbered list"), I("task", "Checklist"), I("quote", "Quote"),
  I("callout", "Callout"), I("code", "Code block"), I("divider", "Divider"), I("image", "Image"),
  I("table", "Table"), I("columns", "2 columns"),
];
const shared = [I("insert-below", "Insert below"), I("duplicate", "Duplicate"), I("copy", "Copy content"),
  I("block-link", "Copy link to block"), I("move-up", "Move block up"), I("move-down", "Move block down"), I("comment", "Comment")];
export function actionsFor(kind: Kind): Item[] {
  switch (kind) {
    case "link": return [I("link-open", "Open link"), I("link-edit", "Edit link"), I("link-copy", "Copy URL"), I("link-remove", "Remove link")];
    case "taskItem": return [I("toggle-task", "Toggle checked"), I("indent", "Indent"), I("outdent", "Outdent"), ...shared, I("delete", "Delete task")];
    case "table": case "cell": return [
      I("row-before", "Insert row above"), I("row-add", "Insert row below"), I("row-delete", "Delete row"),
      I("col-before", "Insert column left"), I("col-add", "Insert column right"), I("col-delete", "Delete column"),
      I("merge-cells", "Merge selected cells"), I("split-cell", "Split merged cell"), I("header-row", "Toggle header row"),
      I("header-column", "Toggle header column"), I("header-cell", "Toggle header cell"), I("align-left", "Align left"),
      I("align-center", "Align center"), I("align-right", "Align right"), I("copy", "Copy"), I("comment", "Comment"), I("table-delete", "Delete table"),
    ];
    case "image": return [I("image-edit", "Caption, replace or resize"), I("image-copy", "Copy image URL"),
      I("image-download", "Download image"), I("duplicate", "Duplicate"), I("block-link", "Copy link to block"),
      I("insert-below", "Insert below"), I("delete", "Delete image")];
    case "horizontalRule": return [I("insert-below", "Insert below"), I("duplicate", "Duplicate"), I("delete", "Delete divider")];
    case "columns": return [I("insert-below", "Insert below"), I("duplicate", "Duplicate"), I("block-link", "Copy link to block"), I("delete", "Delete columns")];
    case "codeBlock": return [I("paragraph", "Turn into text"), I("copy", "Copy code"), I("duplicate", "Duplicate"), I("insert-below", "Insert below"), I("delete", "Delete block")];
    default: return [...insertItems.slice(0, 10),
      ...(["paragraph", "heading", "text"].includes(kind) ? [I("align-left", "Align left"), I("align-center", "Align center"), I("align-right", "Align right")] : []),
      ...(["bulletList", "orderedList", "taskList"].includes(kind) ? [I("indent", "Indent"), I("outdent", "Outdent")] : []),
      ...shared, I("delete", "Delete block")];
  }
}
export const kindFor = (name: string): Kind => (["paragraph", "heading", "bulletList", "orderedList", "taskList",
  "blockquote", "callout", "codeBlock", "horizontalRule", "image", "table", "columns", "taskItem"].includes(name) ? name : "text") as Kind;
export function slashQuery(text: string): string | null {
  const match = /^\s*\/([\p{L}\p{N} _-]{0,40})$/u.exec(text);
  return match ? match[1].trim().toLowerCase() : null;
}
export const filterInserts = (query: string) => insertItems.filter(item => item.label.toLowerCase().includes(query.toLowerCase()));
export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export function placeOverlay(p: Point, s: Size, v: Size, gap = 8): Point {
  return { x: Math.max(gap, Math.min(p.x, v.width - s.width - gap)), y: Math.max(gap, Math.min(p.y, v.height - s.height - gap)) };
}
