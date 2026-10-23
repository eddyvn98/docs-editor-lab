# Lark Docs document-surface pass

Base: f5d9ef929b24ef40a62dfcccfe5cd5b821b8bc20, branch gpt/lark-docs-ux.
This pass was reconciled onto the branch update received while implementing it.
It preserves the document-template gallery, toggleBlock/pageBreak schema,
image-preview crop presets, non-destructive insertion guards and reading guards.
The personal block-template library is separate from preset document templates.
This pass changes only the independent document editor. It does not implement
Lark Messenger, Sheets, Base, a cloud workspace or simulated permission controls.
The commit uses [skip ci]; the existing workflow is unchanged.

## Public behavior references

These are behavior references, not copied assets or claims of complete parity:

- Toolbars: https://www.larksuite.com/hc/en-US/articles/603408453077-use-toolbars-in-docs
- Blocks: https://www.larksuite.com/hc/en-US/articles/608015471697-use-blocks-in-docs
- Callouts: https://www.larksuite.com/hc/en-US/articles/610649161215-insert-callouts-in-docs
- Code: https://www.larksuite.com/hc/en-US/articles/765028877064-insert-code-blocks-in-docs
- Block templates: https://www.larksuite.com/hc/en-US/articles/706066946022-use-block-templates-in-docs
- Images: https://www.larksuite.com/hc/en-US/articles/270485351424-insert-images-in-docs

## Implemented in this pass

1. Content-first controls: remove the pinned formatting ribbon by default.
   The selection toolbar now includes paragraph/heading style, alignment,
   lists/tasks, text/background colors, block style and template saving.
   The table toolbar follows the selected table rather than the page header.
2. Callouts: pick an icon, background, text color and border; reset appearance.
   The node remains named callout; existing nested content is preserved.
3. Block color and indentation: selected blocks have optional validated color
   and indent attributes. Changing these does not remove inline marks/comments.
4. Code blocks: keep StarterKit's codeBlock commands, schema and input rules.
   Add an in-block language selector, wrap toggle, copy/status, and syntax
   decorations. The conservative lexer supports JS, TS, JSON, Python, SQL, CSS,
   Bash, HTML and XML; plain text and unsupported languages remain uncolored.
   This is not Lark's complete 70-plus-language highlighting coverage.
5. Slash commands: recognize a command at line start or after whitespace before
   the caret. Remove only the command token; preserve prefix/suffix text and
   marks. Text-like choices convert the paragraph; structural choices insert
   below it. The transaction starts a separate undo event. URLs do not trigger.
6. Insert Below: open a block picker, with table dimensions, instead of silently
   adding a paragraph. Keep the target's parent, including columns/list items.
7. Block templates: save, preview, search, rename, delete and insert local block
   templates. Copied blocks receive new identities; source comment marks are
   omitted. The library is local (60 entries / 1 MB), not synced across accounts.
   Invalid/full storage is reported rather than silently overwritten.
8. Image cropping: pointer rectangle, keyboard/numeric bounds, reset, Escape
   cancellation and original-file preservation. Crop is represented by safe
   percent attributes plus original aspect ratio, not raster edits or canvas.
   JSON and HTML preserve the crop; the image viewer/download use the original.

No dependency was added. Existing node names, storage keys and baseline document
JSON remain supported. Optional attributes are added for appearance, code wrap,
and image crop. Replacing image sources clears previous crop metadata, including
when using the existing raster crop tool. Exported images use a figure wrapper; old img HTML still parses.
The new figure rule treats captions as image metadata, avoiding extra paragraphs.

## Verification actually performed

- 58 new dependency-free Node tests: passed.
- Strict TypeScript checks for six pure modules: passed.
- TypeScript syntax transpilation for 29 changed/new TS/TSX modules: passed.
- All three modified/new browser scripts: syntax checked, NOT executed.
- Every changed source file is under 300 lines.
- Full app typecheck/build, Playwright interactions and visual QA: NOT verified.
  The terminal cannot resolve GitHub/npm package hosts to install dependencies.
- CI: deliberately not invoked. Older green runs do not validate this commit.

For a dependency-enabled local checkout:

    npm ci
    npm run build
    npm test
    npm install --no-save --package-lock=false playwright@1.56.1
    npx playwright install chromium
    npm run test:browser
    node tests/reliability-browser.mjs
    node tests/workspace-browser.mjs
    node tests/docs-surface-browser.mjs
    # Existing UI-feature suite also remains supported on a running dev server:
    EDITOR_URL=http://127.0.0.1:5173 node tests/ui-features-browser.mjs

The new browser suite covers contextual controls, callout styling, code tools,
inline slash/undo, block template identity, crop/reset and reading mode at desktop
and narrow widths. These are test definitions, not claimed browser pass results.

## Remaining gaps inside Docs, not other Lark products

This repository still does not have full Lark Docs parity. UI/editor gaps include
multi-block drag selection and batch movement, flexible multi-column resizing,
auto-aligned image rows and image-region comments, full equation rendering,
attachments/audio/video/web-card nodes, complete code language coverage, synced
blocks and tracked/suggested edits. Shared editing, collaborator permissions,
notifications, server history and cross-document synchronization need real
services and are not represented by pretend enabled buttons in this lab.
