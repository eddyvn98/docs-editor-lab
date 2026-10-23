import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { Transaction } from '@tiptap/pm/state';
import { ModalSurface } from './ModalSurface';
import { positionById } from './BlockIdentity';
import { captureTemplate, insertTemplate } from './templateActions';
import { TEMPLATE_KEY, TEMPLATE_LIMIT, decodeTemplates, encodeTemplates, templateName, templateExcerpt } from './templateModel';
import type { BlockTemplate, TemplateNode } from './templateModel';

export function TemplateDialog({ editor, mode, position, onClose }: { editor: Editor; mode: 'save' | 'insert'; position?: number; onClose: () => void }) {
  const [initial] = useState(() => {
    try { return { list: decodeTemplates(localStorage.getItem(TEMPLATE_KEY)), error: '' }; }
    catch { return { list: [] as BlockTemplate[], error: 'The template library cannot be read. Existing data has not been overwritten.' }; }
  });
  const [list, setList] = useState(initial.list), [error, setError] = useState(initial.error);
  const [name, setName] = useState(''), [query, setQuery] = useState(''), [chosen, setChosen] = useState('');
  const [source] = useState(() => { try { return captureTemplate(editor, position); } catch { return [] as TemplateNode[]; } });
  const bookmark = useRef(editor.state.selection.getBookmark());
  const target = useRef(position), targetId = useRef(position === undefined || position < 0 || position >= editor.state.doc.content.size ? undefined : editor.state.doc.nodeAt(position)?.attrs.blockId);
  const selected = list.find(item => item.id === chosen);
  useEffect(() => {
    const map = ({ transaction }: { transaction: Transaction }) => { bookmark.current = bookmark.current.map(transaction.mapping);
      if (target.current !== undefined && target.current >= 0) {
        const mapped = transaction.mapping.mapResult(target.current, 1);
        target.current = targetId.current ? positionById(editor, String(targetId.current)) ?? -1 : mapped.deleted ? -1 : mapped.pos;
      } };
    editor.on('transaction', map); return () => { editor.off('transaction', map); };
  }, [editor]);
  const persist = (next: BlockTemplate[]) => {
    if (initial.error) { setError(initial.error); return false; }
    try { localStorage.setItem(TEMPLATE_KEY, encodeTemplates(next)); setList(next); setError(''); return true; }
    catch { setError('Could not save templates: storage is blocked, full, or the library exceeds 1 MB. No document content was removed.'); return false; }
  };
  const save = () => {
    const label = templateName(name);
    if (!label || !source.length || !editor.isEditable) { setError('Enter a name and choose document content to save.'); return; }
    if (list.length >= TEMPLATE_LIMIT) { setError(`Keep at most ${TEMPLATE_LIMIT} local templates. Delete one before saving another.`); return; }
    if (persist([...list, { id: crypto.randomUUID(), name: label, content: source, createdAt: new Date().toISOString(), uses: 0 }])) onClose();
  };
  const insert = () => {
    if (!selected) return;
    try {
      editor.view.dispatch(editor.state.tr.setSelection(bookmark.current.resolve(editor.state.doc)));
      if (!insertTemplate(editor, selected.content, target.current)) throw new Error('Could not insert at this position.');
    } catch (e) { setError(e instanceof Error ? e.message : 'The template is incompatible with this document.'); return; }
    // Usage counters must never roll back a successful document insertion.
    persist(list.map(item => item.id === selected.id ? { ...item, uses: item.uses + 1 } : item));
    onClose(); requestAnimationFrame(() => editor.view.focus());
  };
  return <ModalSurface title={mode === 'save' ? 'Save block template' : 'Block templates'} onClose={onClose} className="template-dialog">
    <p className="dialog-hint">Personal templates in this browser. Each insertion is an independent copy, not a synced block.</p>
    {mode === 'save' ? <form onSubmit={event => { event.preventDefault(); save(); }}>
      <label>Template name<input autoFocus aria-label="Template name" maxLength={80} value={name} onChange={event => setName(event.target.value)}/></label>
      <pre className="template-preview">{templateExcerpt(source) || 'Empty block'}</pre>
      <div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button disabled={!name.trim() || !!initial.error}>Save template</button></div>
    </form> : <>
      <input autoFocus aria-label="Search templates" placeholder="Search your saved blocks..." value={query} onChange={event => setQuery(event.target.value)}/>
      <div className="template-library" role="group" aria-label="Saved templates">
        {list.filter(item => item.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.uses - a.uses).map(item =>
          <button type="button" key={item.id} aria-pressed={chosen === item.id} onClick={() => { setChosen(item.id); setName(item.name); }}>
            <strong>{item.name}</strong><small>{templateExcerpt(item.content) || 'Empty block'}</small></button>)}
        {!list.length && <p>No templates yet. Select a block, open its actions, and choose Save to My Templates.</p>}
        {!!list.length && !list.some(item => item.name.toLowerCase().includes(query.toLowerCase())) && <p>No matching templates.</p>}
      </div>
      {selected && <section className="template-detail"><pre className="template-preview">{templateExcerpt(selected.content)}</pre>
        <label>Rename<input aria-label="Rename template" maxLength={80} value={name} onChange={event => setName(event.target.value)}/></label>
        <div className="dialog-actions"><button type="button" disabled={!name.trim()} onClick={() => persist(list.map(item => item.id === chosen ? { ...item, name: templateName(name) } : item))}>Save name</button>
          <button type="button" onClick={() => { if (persist(list.filter(item => item.id !== chosen))) { setChosen(''); setName(''); } }}>Delete template</button>
          <button type="button" onClick={insert}>Insert template</button></div>
      </section>}
    </>}
    {error && <p role="alert">{error}</p>}
  </ModalSurface>;
}
