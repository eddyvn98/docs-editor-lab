# Interaction acceptance

## Document shell

- Desktop document page with breadcrumb/title, save state, document actions,
  formatting controls, a readable page surface, and an outline/navigation area.
- Narrow screens keep editing usable and place panels where they do not cover
  the active text or block.
- Use realistic sample content containing headings, paragraphs, lists, tasks,
  a callout, code, a link, an image, a table, and a divider.

## Text selection

- Selecting text opens a compact floating toolbar at the selection.
- Formatting controls are relevant to the selection; link editing opens next to
  the selected link and preserves the selection/caret.
- Toolbar and popovers dismiss on outside click and Escape, and remain anchored
  after scrolling or resizing.

## Blank lines and blocks

- Hovering a blank line reveals an insert (+) control. It opens an anchored
  picker for the available block types.
- Typing `/` on a blank line opens a searchable slash-command menu; choosing an
  item inserts the correct block without losing focus.
- Hovering a block reveals a drag handle. Dragging reorders blocks; its menu
  shows actions that make sense for that block type.
- Right-clicking a block opens an anchored, type-specific context menu at the
  pointer. Right-clicking a table cell targets that cell. The browser menu is
  suppressed only inside the editor surface.
- Menus support keyboard navigation, have no stale target after the document
  changes, and close on outside click or Escape.

## Type-specific popovers and actions

- Text: format, convert block type, align/indent, text/background color, copy,
  duplicate, comment placeholder, insert below, and delete.
- Link: preview, edit, copy, and remove link.
- Image: caption, resize, replace, copy, download, and delete.
- Table/cell: insert or delete row/column, cell alignment, copy, comment
  placeholder, and delete table.
- Code, task, quote, callout, and divider each expose only applicable actions.
- Each popover is attached to the item that opened it, not a shared static
  toolbar detached from the content.

## Verification

- Verify pointer selection, hover, left-click, right-click, dragging, scrolling,
  outside-click dismissal, and Escape on desktop.
- Verify the editor, menus, and popovers at desktop and narrow viewport sizes.
- Verify no console errors, content loss, or unexpected page/context-menu
  events while using the editor.
- Keep each source file under 300 lines; split focused components as needed.

## Public behavior references

- [Use toolbars in Docs](https://www.larksuite.com/hc/en-US/articles/603408453077-use-toolbars-in-docs)
- [Use blocks in Docs](https://www.larksuite.com/hc/en-US/articles/608015471697-use-blocks-in-docs)
- [Add hyperlinks in Docs](https://www.larksuite.com/hc/en-US/articles/269191799254-add-hyperlinks-in-docs)
- [Insert images in Docs](https://www.larksuite.com/hc/en-US/articles/270485351424-insert-images-in-docs)
