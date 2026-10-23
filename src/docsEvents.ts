import type { Editor } from '@tiptap/react';
export type DocsRequest = { action: 'templates' | 'template-save' | 'block-style' | 'image-crop' | 'insert-below'; pos?: number };
export const DOCS_REQUEST = 'docs-editor-request';
export function requestDocs(editor: Editor, request: DocsRequest): void {
  editor.view.dom.dispatchEvent(new CustomEvent<DocsRequest>(DOCS_REQUEST, { bubbles: true, detail: request }));
}
