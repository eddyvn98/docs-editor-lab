# Workspace UX pass

This change remains a single-document, local-only editor lab. It does not add a
cloud service or pretend that local reading mode is an access-control boundary.
No production repository or CI workflow is changed. The commit uses [skip ci].

## Implemented

- Persistent responsive formatting dock: paragraph/headings, font family and
  size, bold/italic/underline/strike/code, text color, highlights, lists/tasks,
  quotes, alignment, line spacing, clear marks, links and comments.
- Table dock: select whole rows, columns or the table; add/delete rows/columns;
  merge/split selected cells; header row; cell fill and vertical alignment.
- Document heading folding implemented with ProseMirror decorations, not
  deletion or serialized hidden-content flags. Dragging a folded heading moves
  its whole section; clear formatting preserves link and comment marks. Folding follows top-level heading
  hierarchy, can be expanded from the outline, and is revealed by navigation.
- Sidebar tabs for outline and comments, current-section indication,
  expand/collapse-all, and independent local folding preferences.
- Local reading/editing, focus, page/full-width, reading font/size and dark/light
  view preferences. Read mode hides mutating controls, disables the editable
  surface/title, and removes comment mutation controls. This is a local UX mode,
  not security or collaboration permissions.
- Searchable insert dialog, adjustable table dimensions (1-20 each), keyboard
  selection, and a mapped selection bookmark. Nonempty blocks and selected text
  are preserved; new blocks are inserted below rather than replaced.
- Native modal focus handling and Escape dismissal; keyboard help and shortcuts
  for inserting a block (Ctrl/Cmd+Shift+P) and opening help (Ctrl/Cmd+/).
- Image viewer: next/previous, zoom, reset, caption/alt text, load-error fallback.
  Double-click in edit mode or single-click an image in reading mode.

## Architecture and compatibility

Existing node and mark names, session storage, comments, image data URLs and
block IDs remain supported. New optional attributes: lineSpacing on paragraphs
and headings; cellBackground and verticalAlign on table cells/headers. All
attributes validate allowed values when rendered. No dependencies are added.

Folding and view preferences are separate from document JSON and do not create
undo history entries. Printing expands folded document sections. Headings nested
inside tables/columns are not folded by the top-level section plugin, avoiding
accidental hiding of neighboring columns. Image preview is not destructive crop.

## Verification performed in this environment

- 29 new dependency-free workspace tests pass with Node 22 type stripping.
- Strict TypeScript check passes for outlineModel, viewPreferences, blockCatalog.
- All new/changed TS/TSX modules pass TypeScript syntax transpilation.
- Every changed source file remains under 300 lines.
- workspace-browser.mjs is written and syntax-checked, but not executed here.
- Full dependency installation, application typecheck/build and Chromium checks
  remain unverified: this terminal cannot resolve github.com or npm registry.
- CI is deliberately skipped as requested; previous green runs do not validate
  this commit.

Commands for a dependency-enabled checkout:

    npm ci
    npm run build
    npm test
    npm install --no-save --package-lock=false playwright@1.56.1
    npx playwright install chromium
    npm run test:browser
    node tests/reliability-browser.mjs
    node tests/workspace-browser.mjs

## Explicit remaining boundaries

This is not full Lark product parity. Server-side collaboration, access control,
remote history, synced blocks, cross-user mentions/notifications, tracked changes,
DOCX/PDF import and arbitrary embedded apps are not implemented. Existing HTML,
JSON and browser print/PDF export remain available through document tools.
No verification result above should be read as browser or full-build approval.
