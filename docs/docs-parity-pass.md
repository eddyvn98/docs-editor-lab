# Lark Docs template and inline content pass

Base commit: f82f0ffd22607314bd654565471b30a3814d435e, existing branch gpt/lark-docs-ux.

Scope: Docs only. Board/Kanban and unrelated Lark products are deliberately excluded.

- Document gallery: realistic previews, navigation, source tabs (Recommended, My templates, Shared with me), truthful empty states, search, categories and one-transaction template insertion.
- Shortcuts: /Mẫu lists Meeting Notes, Project Plan, Weekly Report, SWOT Mind Map, Project Planning and Implementation, and Mẫu khác; choosing a shortcut inserts all blocks in a single transaction without network-loading placeholders.
- Inline Sheets: 3×2 editable default, add rows/columns, selected-cell format, right-merge/unmerge, row filtering, frozen header, find/replace, link entry and full-screen view. Sheet data is document JSON, not a remote spreadsheet.
- ToC: derives headings from this document with navigable entries and an explanatory empty state.
- Timeline: editable newline-separated events, visible events without a spinner.
- Mermaid: editable graph source, simple arrow/label rendering for basic graph edges and the source retained as a readable fallback. This is not a complete Mermaid renderer.
- Existing block identity/history support is preserved; new atom blocks receive stable IDs.
- No plugin installation, no cloud/shared template claims.

Validation constraints: the GitHub connector can read and write, but the shell cannot resolve github.com/npm hosts to install dependencies. The optional browser suite tests template Undo, inline sheet edit and ToC/Timeline/Mermaid at two widths. It must be executed against a dependency-enabled clean clone. No CI is invoked.
