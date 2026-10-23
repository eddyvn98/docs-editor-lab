# Templates, structured blocks and image crop

This change is based on `f9fcee9275489659e333394ed9e825af95eb013c`.
The branch advanced from `51aa1db` during implementation. Its workspace toolbar,
reader/focus/theme preferences, table dock, heading folding/group movement,
searchable insertion and outline/comment tabs are retained rather than replaced.
Only the independent lab is changed. CI is intentionally skipped with `[skip ci]`.

## Added interactions

- Five searchable insert-only templates: meeting notes, project brief, decision
  record, weekly update and review checklist. The toolbar opens the gallery.
  Insertion appends in one transaction, preserves existing text/comments and
  receives fresh block IDs. No network catalog is involved.
- Additive `toggleBlock` and `pageBreak` node types, registered in both the slash
  menu and the existing workspace insert palette. Toggle titles are editable;
  the body remains in the document when collapsed. In reading mode expansion
  does not change document content. Page breaks affect printing.
- The existing image viewer retains Previous/Next, captions and zoom. A new Crop
  action opens fit/actual-size preview, aspect presets, draggable region and
  keyboard/sliders. Applying creates a local PNG in one undoable transaction.
  Stable block ID and source are checked before applying asynchronous results.
- Escape/backdrop dismissal and native dialog focus containment. Closing the
  crop modal before image processing finishes prevents a late editor mutation.
- Non-text block insertion preserves a nonempty source block instead of silently
  replacing its text with an image/table/divider/columns/page break.
- Editing actions, paste/drop and editing shortcuts are guarded in reading mode.
  A view-only transaction refreshes node-view controls on mode changes.
- No duplicate workspace dock, duplicate heading-folding plugin, alternative
  preference schema or replacement theme is introduced. Folded heading movement
  and duplication retain the concurrently added grouped behavior.

## Compatibility and limits

Existing node names and session storage remain intact. Hosts importing documents
with toggles or page breaks must register those additional extensions. There are
no new dependencies, backend services or changes to CI configuration.

Crop needs the remote image server's CORS permission, or a local uploaded image.
Failures are explicit; there is no proxy. Results are downscaled to at most
4096 px and rejected if their data URL exceeds 2,000,000 characters. This is an
undoable crop, not a full nondestructive photo-editing system.

This is not full Lark service parity. Multiuser collaboration, cloud permissions,
server history, synced blocks, tracked-change review and DOCX/PDF import are not
implemented. Reading mode is a local UI preference, not a security boundary.

## Validation

- `node --experimental-strip-types --test tests/ui-features.test.mjs`: 24 tests
  passed for crop geometry, template data/search and block/menu integration.
- Syntax transpilation covers the changed/new TypeScript modules; it is not a
  full dependency-aware typecheck.
- Strict checks cover the dependency-free crop geometry, block catalog and menu
  logic modules. The optional browser suite passes syntax checking only.
- All changed/new source files remain below 300 lines.
- No GitHub Actions workflow was started or rerun. Full application build and
  browser execution are unverified because the terminal cannot resolve package
  hosts and has no installed TipTap/React dependencies.

Earlier development checks against the pre-concurrent draft included 37 pure
logic tests. Those are not reported as tests of this final integrated version.
The final pass keeps only relevant tests and avoids unused parallel UI modules.

## Optional local browser suite

With dependencies and Playwright installed, start `npm run dev`, then run:

```sh
EDITOR_URL=http://127.0.0.1:5173 node tests/ui-features-browser.mjs
```

The authored suite covers template insertion without content loss, toggle
collapse/title edits, image viewer/crop/undo and modal Escape at desktop and
narrow widths. It has not been executed in this session. Existing workspace and
reliability suites remain unchanged and available for later verification.
