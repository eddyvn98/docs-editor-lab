import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { defaultView, parseView } from './viewPreferences';
import type { ViewPreferences } from './viewPreferences';
const KEY = 'docs-editor-lab-view-v1';
export function useViewPreferences(editor: Editor | null) {
  const [view, setView] = useState<ViewPreferences>(() => {
    try { return parseView(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return defaultView; }
  });
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(view.mode === 'edit', false);
      editor.view.dispatch(editor.state.tr.setMeta('viewModeChanged', true).setMeta('addToHistory', false));
    }
  }, [editor, view.mode]);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(view)); } catch { /* Editing still works. */ } }, [view]);
  return { view, setView, patchView: (patch: Partial<ViewPreferences>) => setView(old => parseView({ ...old, ...patch })) };
}
