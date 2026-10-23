import { useLayoutEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { DocsEnhancements } from './DocsEnhancements';
import { requestDocs } from './docsEvents';
/** Compatibility boundary: formatting lives next to selected content, not in a pinned ribbon. */
export function FormatBar({ editor, readOnly, onInsert, onHelp, onTemplates }: {
  editor: Editor; readOnly: boolean; onInsert: () => void; onLink: () => void; onComment: () => void; onHelp: () => void; onTemplates?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = ref.current?.closest<HTMLElement>('.app-shell');
    root?.style.setProperty('--format-height', '0px');
  }, [readOnly]);
  return <>
    <div ref={ref} className={readOnly ? 'reading-strip' : 'docs-content-actions'} aria-label="Document insert actions">
      {readOnly ? <><span>Reading mode</span><span>Your document stays in this browser.</span></> : <>
        <button type="button" aria-label="Insert block" onPointerDown={event => event.preventDefault()} onClick={onInsert}>+ Insert</button>
        <button type="button" onPointerDown={event => event.preventDefault()} onClick={() => requestDocs(editor, { action: 'templates' })}>Templates</button>
        {onTemplates && <button type="button" aria-label="Document templates" onPointerDown={event => event.preventDefault()} onClick={onTemplates}>Document templates</button>}
        <span>Select text for formatting</span><button type="button" aria-label="Keyboard shortcuts" onClick={onHelp}>?</button>
      </>}
    </div>
    <DocsEnhancements editor={editor} readOnly={readOnly} onOpen={() => { /* Native dialogs manage their own focus. */ }}/>
  </>;
}
