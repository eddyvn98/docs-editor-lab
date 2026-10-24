import { Check, MessageSquareDiff, X } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { useEditorPulse } from '../useEditorPulse';
import { goToHeading } from '../HeadingFolding';
import { suggestions, resolveSuggestion } from '../docs-content/reviewModel';
import { t } from './locale';
export function ReviewPanel({ editor }: { editor: Editor }) {
  useEditorPulse(editor);
  const items = suggestions(editor.state.doc);
  return <section className="docs-review-panel" aria-label="Suggested changes">
    {!items.length && <div className="docs-panel-empty"><MessageSquareDiff size={28}/><strong>{t('No suggested changes')}</strong><p>{t('Switch to Suggesting to propose changes without losing the original content.')}</p></div>}
    {items.map(item => <article className="docs-review-card" key={item.id} data-review-id={item.id}>
      <header><span className="docs-avatar">Y</span><div><strong>{t('You')}</strong><small>{item.at && Number.isFinite(Date.parse(item.at)) ? new Date(item.at).toLocaleString() : t('Suggested change')}</small></div>
        {editor.isEditable && <div><button title={t('Accept')} aria-label="Accept suggestion" onClick={() => resolveSuggestion(editor, item.id, true)}><Check size={16}/></button><button title={t('Reject')} aria-label="Reject suggestion" onClick={() => resolveSuggestion(editor, item.id, false)}><X size={16}/></button></div>}</header>
      <button className="docs-review-excerpt" onClick={() => goToHeading(editor, item.from)}>
        {item.deleted && <del>{item.deleted.slice(0, 500)}</del>}{item.inserted && <ins>{item.inserted.slice(0, 500)}</ins>}
        {item.blocks > 0 && <small>{t('Block change')}</small>}
      </button>
    </article>)}
  </section>;
}
