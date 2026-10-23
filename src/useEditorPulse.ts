import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
/** Keep command availability fresh even when only the selection changes. */
export function useEditorPulse(editor: Editor | null): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!editor) return;
    let frame = 0;
    const update = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => setVersion(v => v + 1)); };
    editor.on('transaction', update); editor.on('selectionUpdate', update); editor.on('update', update);
    return () => { cancelAnimationFrame(frame); editor.off('transaction', update); editor.off('selectionUpdate', update); editor.off('update', update); };
  }, [editor]);
  return version;
}
