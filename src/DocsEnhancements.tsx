import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { DOCS_REQUEST } from './docsEvents';
import type { DocsRequest } from './docsEvents';
import { TemplateDialog } from './TemplateDialog';
import { BlockStyleDialog } from './BlockStyleDialog';
import { ImageCropDialog } from './ImageCropDialog';
import { InsertPalette } from './InsertPalette';
import './lark-content.css';
export function DocsEnhancements({ editor, onOpen, readOnly }: { editor: Editor; onOpen: () => void; readOnly: boolean }) {
  const [request, setRequest] = useState<DocsRequest | null>(null), begin = useRef(onOpen);
  begin.current = onOpen;
  useEffect(() => {
    const receive = (event: Event) => {
      const value = (event as CustomEvent<DocsRequest>).detail;
      if (!editor.isEditable || !value || !['templates', 'template-save', 'block-style', 'image-crop', 'insert-below'].includes(value.action)) return;
      begin.current(); setRequest(value);
    };
    const dom = editor.view.dom; dom.addEventListener(DOCS_REQUEST, receive);
    return () => dom.removeEventListener(DOCS_REQUEST, receive);
  }, [editor]);
  useEffect(() => { if (readOnly) setRequest(null); }, [readOnly]);
  if (!request || readOnly) return null;
  const close = () => setRequest(null);
  if (request.action === 'insert-below') return <InsertPalette editor={editor} afterPos={request.pos} onClose={close}/>;
  if (request.action === 'image-crop' && request.pos !== undefined) return <ImageCropDialog editor={editor} position={request.pos} onClose={close}/>;
  if (request.action === 'block-style') return <BlockStyleDialog editor={editor} position={request.pos} onClose={close}/>;
  return <TemplateDialog editor={editor} mode={request.action === 'template-save' ? 'save' : 'insert'} position={request.pos} onClose={close}/>;
}
