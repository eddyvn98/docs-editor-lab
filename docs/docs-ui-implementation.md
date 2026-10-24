# Docs UI and interaction implementation

Base: `5146cc3b16eb82e0296d0c78bfd8e66428839fb3`.
Branch: `gpt/lark-docs-ux`. Source implementation only; QA is deferred by request.

## Document surface

- Content-first white document shell, compact icon actions, independent left
  outline and right comments/review panels, responsive drawers and focus mode.
- Document icon, uploaded/preset cover, cover positioning, growing title field,
  real local save state and edit timestamp; persistent English/Vietnamese choice.
- Editing, Suggesting and Reading modes; local file sharing/export is explicitly
  distinguished from cloud permissions and multiuser collaboration.
- Anchored insertion, slash commands, grouped context menus, table-size grid,
  contextual formatting/color controls and keyboard navigation.
- Headings 1-9 with valid exported HTML, outline nesting and section folding.
- Find/replace with case and whole-word options, current-result navigation and
  heading reveal. Local checkpoint history retains the existing storage keys.

## Editing and content

- Real ProseMirror block-range selection, rail marquee, keyboard extension,
  group move/duplicate/copy/delete, group context toolbar, column/image grouping.
- Adjustable columns with pointer/keyboard resizing and one committed resize
  transaction. Pointer cancellation restores the previous widths.
- Image rows/grids, editable captions/alignment and image-region comments.
  Region anchors use normalized coordinates and the source identity, including
  cropped images; replies, resolution, editing and reactions use local threads.
- File, audio, video and web-card nodes with real upload/open/play/download flows,
  IndexedDB binary storage and visible loading/error states. Runtime object URLs
  are revoked and are never used as the persistent document reference.
- Portable JSON/HTML dereferences attachment assets; JSON import rehydrates them.
  Existing JSON/HTML, old node names, recovery state and checkpoint keys remain.
- Inline/display equations render a bounded TeX subset to native MathML without
  evaluation, remote requests or unsanitized HTML. Unsupported syntax remains
  editable and produces an explicit error, not an empty or fake rendered block.
- Linked blocks propagate within the current document and can be unlinked.
  They are not represented as cross-account or cross-document cloud sync.
- Persisted insertion/deletion suggestions and individual accept/reject actions,
  including whole-block proposals. Attribute-only formatting/metadata changes
  remain direct edits; this is not a complete collaborative revision service.
- Rich clipboard output and paste normalization preserve schema-supported
  formatting while clearing copied comment/review identities.

## Compatibility and boundaries

Board/Kanban and CI configuration are untouched. Sheets is not offered in the
new Docs insertion surfaces. The existing inlineSheet schema stays registered
so previously saved documents can still be opened; it was not extended.

No dependencies or package lock changes are needed. Attachments are local to
this origin until explicitly exported. Portable exports are bounded to 60 MB
of referenced assets; individual uploaded attachments are bounded to 100 MB.
Image uploads use the existing small-image model to avoid filling localStorage.
HTML is an interchange format, not a full-fidelity backup of comment threads;
use portable JSON to preserve review state, document metadata and comments.

No fake collaborators, permissions, server versions, notifications, public
links, or automatic website metadata fetching are introduced.

## Verification status

Only TypeScript source syntax and the under-300-lines source limit were checked.
No npm test, application build, dependency-aware typecheck, browser acceptance,
visual regression or CI was run in this implementation pass, as requested.
The older 155-test result does not validate this change.

Before release, run local build/unit/browser checks and update old suite
expectations for the intentional menu/panel changes and hidden Sheets entry.
Prioritize composition/IME suggestions, nested block selection, grouped Undo,
column drag cancellation, paste fidelity, import/recovery, asset export,
reading-mode mutation guards, keyboard focus and the 1365/390 px reference views.
This source pass is not a measured pixel-parity certification against Lark.
