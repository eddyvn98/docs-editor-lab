# Local editor reliability pass

This pass modifies only the standalone lab on `gpt/lark-docs-ux`.
The commit intentionally contains `[skip ci]`; no Actions jobs were requested.
The existing workflow remains unchanged for future use.

## Implemented

- Stable block IDs, copyable block anchors, keyboard reorder/duplicate, and
  fresh IDs on duplication. Text-comment marks are not duplicated into a new thread.
- Transaction-mapped popup targets and saved selection bookmarks. Deleted or
  type-changed targets close instead of applying to an unrelated block.
- Context menus resolve nested images, table cells and task items. Table merge
  preserves CellSelection; task menus include checked/indent/outdent actions.
- Floating panels use a body portal, ProseMirror coordinates, resize observation
  and visual viewport bounds. Menu keys respect IME composition and input focus.
- Searchable insert picker, keyboard context menus, Escape/cancel restoration,
  drag cancellation, autoscroll and a visible drop indicator.
- Atomic local sessions containing document, title and comments; debounced saves,
  truthful quota errors, unload warnings and explicit cross-tab conflict handling.
- Validated startup recovery, import validation and automatic checkpoints before
  import/restore. Original legacy storage is retained, not deleted.
- Comment replies, resolve/reopen, detached-reference notices and deletion of
  the matching text mark. Overlapping threads are rejected rather than overwritten.
- Search across formatting boundaries, visible matches and literal replacement.
  Unicode case handling preserves ProseMirror UTF-16 positions.
- Link validation and visible link text when inserting at an empty caret; image
  alt text, keyboard resizing, pointer-capture cleanup and asynchronous insertion
  mapped to the original position. Sample imagery is bundled locally.
- Full HTML exports with document styling, JSON bundles including comments/title,
  and a separate raw TipTap JSON export. Clipboard/download errors are reported.

## Persistence and schema compatibility

Existing TipTap node names remain intact. The additive `blockId` attribute is
assigned to eligible blocks on load and after changes. Custom comment, image and
column nodes keep their existing names and attributes.

The new session key is `docs-editor-lab-session-v2`. On first use, the editor reads
legacy `docs-editor-lab-v1` and comment storage. It writes one new atomic snapshot
without deleting legacy keys. A corrupt document pauses saving and, where browser
storage permits, preserves the original string under `docs-editor-lab-recovery-v1`.

Version checkpoints include title and local threads. Their v2 store retains up to
eight snapshots and reads the older v1 store when no v2 history exists. Checkpoint
failure blocks destructive import/restore; export JSON and free space first.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl/Cmd+K | Add or edit a link |
| Ctrl/Cmd+Shift+M | Comment on text |
| Ctrl/Cmd+F while editing | Find and replace |
| Shift+F10 | Current block context menu |
| Alt+Shift+Up/Down | Move current top-level block |
| Ctrl/Cmd+Shift+D | Duplicate current top-level block |
| Escape | Dismiss panel or cancel dragging |
| Left/Right on image resize handle | Resize in 5% increments |

## Verification performed for this pass

The local environment could not resolve GitHub/npm hosts. No dependency install,
full app build, audit or Chromium execution is claimed for this pass.

Executed locally on Node 22:

```sh
node --experimental-strip-types --test tests/*.test.mjs
# 38 passed: 16 existing tests plus 22 new reliability tests; 0 failed.

tsc --noEmit --strict --target ES2022 --module ESNext \
  --moduleResolution Bundler --lib ES2022,DOM \
  src/safety.ts src/documentUtils.ts src/storage.ts src/logic.ts
# Passed for these four dependency-free modules, not the entire application.

node --check tests/reliability-browser.mjs
# Syntax check only.
```

A local TypeScript transpileModule syntax check also covered all 30 changed/new
TypeScript modules with zero syntax diagnostics. Source files in this pass are
below 300 lines. These checks are not substitutes for the full build or browser
acceptance suite.

The optional browser suite is ready for a local environment with dependencies:

```sh
npm ci
npm run build
npm test
npm install --no-save --package-lock=false playwright@1.56.1
npx playwright install chromium
npm run test:browser
node tests/reliability-browser.mjs
```

The new browser suite exercises session/title persistence, malicious link
rejection, Escape focus restoration, image drafts during scroll/resize, thread
replies/deletion, and storage failure notices at desktop and narrow widths.
It was authored and syntax checked, but not executed in this environment.

## Deliberate remaining boundaries

This is still a serverless single-document editor, not full Lark parity. Cloud
permissions, multiuser/Yjs transport, durable server history, DOCX/PDF importing,
tracked-change review, image cropping and synced embeds are not implemented.
Browser Print/PDF is not a dedicated PDF conversion engine.

Comment metadata is local UI state, not part of ProseMirror's undo history.
Overlapping comment threads are not supported. Saved mark ranges survive normal
text editing; comments on removed text remain visible as detached threads.
Cross-tab conflicts require a user decision rather than automatic merging.
Touch devices and Safari/Firefox still need actual device/browser verification.
