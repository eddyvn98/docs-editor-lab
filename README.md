# Document Editor Lab

A standalone editor sandbox for improving rich-document editing interactions.

The target is a Lark Docs–inspired experience: selection-aware formatting, block
handles, type-specific menus, contextual popovers, slash commands, and reliable
keyboard and pointer behavior. This repository is intentionally decoupled from
the host application so the editor can be iterated on and tested on its own.

## Run locally

```sh
npm install
npm run dev
```

## Scope

- Build a working single-document editor with realistic sample content.
- Keep editor state local to the browser; do not add accounts, credentials,
  network services, or host-application integrations.
- Support paragraphs, headings, lists, tasks, quotes, callouts, code, links,
  images, tables, and dividers in the interaction demo.
- Follow [`docs/ux-acceptance.md`](docs/ux-acceptance.md) and
  [`docs/editor-baseline.md`](docs/editor-baseline.md).

## Reference

This is an independent implementation informed by Lark Docs public help pages.
It is not affiliated with Lark or a pixel-perfect copy of proprietary assets.
