import { useEffect, useReducer } from "react";
import type { Editor } from "@tiptap/react";

// Selection-only transactions must refresh active and disabled toolbar states too.
export function useEditorRevision(editor: Editor | null): number {
  const [revision, update] = useReducer(value => value + 1, 0);
  useEffect(() => {
    if (!editor) return;
    const refresh = () => update();
    editor.on("transaction", refresh);
    return () => { editor.off("transaction", refresh); };
  }, [editor]);
  return revision;
}
