import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { foldingKey, goToHeading, toggleHeading, expandHeadings, documentHeadings } from './HeadingFolding';
import { hiddenByHeading } from './outlineModel';
import { useEditorPulse } from './useEditorPulse';
export function WorkspaceOutline({ editor, onNavigate }: { editor: Editor; onNavigate?: () => void }) {
  const pulse = useEditorPulse(editor), [active, setActive] = useState('');
  const state = foldingKey.getState(editor.state), sections = state?.sections || documentHeadings(editor.state.doc);
  const folded = state?.ids || new Set<string>();
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let id = sections[0]?.id || '';
        for (const section of sections) {
          const node = editor.view.nodeDOM(section.pos);
          if (node instanceof HTMLElement && node.getClientRects().length && node.getBoundingClientRect().top < 180) id = section.id;
        }
        setActive(id);
      });
    };
    update(); window.addEventListener('scroll', update, true); window.addEventListener('resize', update);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [editor, pulse]);
  return <section className="workspace-outline">
    <div className="outline-actions"><button onClick={() => expandHeadings(editor)}>Expand all</button><button onClick={() => expandHeadings(editor, true)}>Collapse all</button></div>
    {!sections.length && <p className="empty-panel">Headings added to the document appear here.</p>}
    <nav aria-label="Document outline">{sections.filter(s => !hiddenByHeading(s.pos, sections, folded)).map(s =>
      <div className={`outline-entry ${active === s.id ? 'current' : ''}`} key={s.id} style={{ paddingInlineStart: Math.min(Math.max(s.level - 1, 0), 4) * 8 }}>
        <button className="outline-fold" aria-label={`${folded.has(s.id) ? 'Expand' : 'Collapse'} section ${s.text || 'Untitled'}`}
          aria-expanded={!folded.has(s.id)} onClick={() => toggleHeading(editor, s.id)}>{folded.has(s.id) ? '\u25b8' : '\u25be'}</button>
        <button title={s.text || 'Untitled heading'} aria-current={active === s.id ? 'location' : undefined} onClick={() => { goToHeading(editor, s.pos); if (window.innerWidth <= 1000) onNavigate?.(); }}>{s.text || 'Untitled heading'}</button>
      </div>)}</nav>
  </section>;
}
