# Extracted editor baseline

## Existing capabilities to preserve

The source editor is a TipTap/ProseMirror document surface with these existing
capabilities:

- Paragraphs, headings, nested lists, tasks, quotes, code, text alignment,
  text styles, highlights, and resizable tables.
- Custom image and embedded-table/chart nodes, image upload, table clipboard,
  slash commands, and document-aware keyboard shortcuts.
- Find/replace, outline navigation, word/character counts, and stable line IDs.
- Optional Yjs collaboration for live documents.

## Extraction boundary

The source editor is coupled to its host through a workspace store, board
permissions, collaboration lookup, image-upload service, and callbacks that
create/embed tables. Keep those host concerns outside this sandbox. Use local
browser state and narrow editor callbacks so each interaction can be tested
without a server. Document the adapters needed to reconnect it to a host later.

The current UI already has a text-format toolbar, slash menu, image/table
extensions, and table-cell context actions. The key gap for this task is a
consistent content-aware block interaction layer: hover handles, right-click
menus, and popovers anchored to the specific selected item. Do not replace the
editor model just to add those interactions.
