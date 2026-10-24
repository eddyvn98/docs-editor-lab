import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, KeyboardEvent as ReactKeyboard } from 'react';
import type { Editor } from '@tiptap/react';
import { ArrowLeft, Check, FileText, LayoutTemplate, MessageSquare, PanelLeft, Plus, Redo2, Search, Share2, Undo2, X } from 'lucide-react';
import type { ViewPreferences } from '../viewPreferences';
import type { useDocumentState } from '../useDocumentState';
import { DocumentTools } from '../DocumentTools';
import { WorkspaceOutline } from '../WorkspaceOutline';
import { CommentsPanel } from '../CommentsPanel';
import { DocsEnhancements } from '../DocsEnhancements';
import { TableToolbar } from '../TableToolbar';
import { useEditorPulse } from '../useEditorPulse';
import { isSuggesting } from '../docs-content/Suggestions';
import { suggestions } from '../docs-content/reviewModel';
import { DocumentHero } from './DocumentHero';
import { starterContent } from '../sampleContent';
import { PageSettings } from './PageSettings';
import { ShareDialog } from './ShareDialog';
import { BlockBatchBar } from './BlockBatchBar';
import { FindBar } from './FindBar';
import { ModeMenu } from './ModeMenu';
import { ReviewPanel } from './ReviewPanel';
import { t, useDocsLocale } from './locale';
type State = ReturnType<typeof useDocumentState>;
export function DocsShell({ editor, state, view, patchView, outlineOpen, onOutline, commentsOpen, onComments, onInsert, onTemplates, onHelp, onComment, notice, children, floating }: {
  editor: Editor; state: State; view: ViewPreferences; patchView: (patch: Partial<ViewPreferences>) => void;
  outlineOpen: boolean; onOutline: () => void; commentsOpen: boolean; onComments: () => void;
  onInsert: () => void; onTemplates: () => void; onHelp: () => void; onComment: () => void;
  notice: ReactNode; children: ReactNode; floating: ReactNode;
}) {
  useEditorPulse(editor);
  const [share, setShare] = useState(false), [panel, setPanel] = useState<'comments' | 'review'>('comments');
  const locale = useDocsLocale(), readOnly = view.mode === 'read', suggesting = isSuggesting(editor), previousMode = useRef(suggesting);
  const count = state.comments.filter(comment => !comment.resolved).length, reviewCount = suggestions(editor.state.doc).length;
  const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, ' '), words = text.trim().split(/\s+/).filter(Boolean).length;
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  useEffect(() => { document.documentElement.dataset.docsTheme = view.theme; }, [view.theme]);
  useEffect(() => { document.title = `${state.title || 'Untitled'} - Docs`; }, [state.title]);
  useEffect(() => {
    const open = () => setPanel('comments'); editor.view.dom.addEventListener('docs-open-comment', open);
    editor.view.dom.addEventListener('docs-add-image-comment', open);
    return () => { editor.view.dom.removeEventListener('docs-open-comment', open); editor.view.dom.removeEventListener('docs-add-image-comment', open); };
  }, [editor]);
  useEffect(() => {
    if (suggesting && !previousMode.current) { setPanel('review'); if (!commentsOpen) onComments(); }
    previousMode.current = suggesting;
  }, [suggesting, commentsOpen, onComments]);
  const review = () => { setPanel('review'); if (!commentsOpen) onComments(); };
  const closePanels = () => { if (outlineOpen) onOutline(); if (commentsOpen) onComments(); };
  const mobilePanel = (event: ReactKeyboard<HTMLElement>, close: () => void) => {
    if (event.key === 'Escape' && !(event.target as Element).closest('dialog,[data-ux-overlay]')) { event.preventDefault(); close(); }
  };
  return <main className={`app-shell docs-shell ${readOnly ? 'is-reading' : ''} ${view.focus ? 'is-focused' : ''}`}
    data-theme={view.theme} data-width={view.width} data-font={view.font} lang={locale} style={{ '--reading-size': `${view.size}px`, '--format-height': '0px' } as CSSProperties}>
    <header className="topbar docs-topbar">
      <div className="docs-heading-group"><button className="docs-icon-button" aria-label="Toggle outline and comments" title={t('Outline')} aria-expanded={outlineOpen && !view.focus} aria-controls="docs-outline" onClick={onOutline}><PanelLeft size={19}/></button>
        <span className="docs-file-badge"><FileText size={20}/></span><div className="docs-header-title"><strong title={state.title}>{state.title || t('Untitled')}</strong><span className="save-state" title={t('Local document')}>{state.status === 'Saved locally' && <Check size={12}/>} {t(state.status)}</span></div></div>
      <div className="top-actions docs-header-actions">
        {!readOnly && <><div className="docs-undo-group"><button className="docs-icon-button" aria-label="Undo" title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={17}/></button><button className="docs-icon-button" aria-label="Redo" title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={17}/></button></div>
          <button className="docs-icon-button docs-insert-trigger" aria-label="Insert block" title={t('Insert')} onPointerDown={event => event.preventDefault()} onClick={onInsert}><Plus size={18}/></button>
          <button className="docs-icon-button docs-template-trigger" aria-label="Document templates" title={t('Templates')} onClick={onTemplates}><LayoutTemplate size={18}/></button>
          <button className="docs-icon-button docs-demo-trigger" aria-label="Nạp toàn bộ 21 block mẫu (Demo)" title="Nạp toàn bộ 21 block mẫu (Demo)" onClick={() => {
            if (window.confirm('Nạp lại toàn bộ 21 block mẫu Lark Docs để hiển thị đầy đủ trên màn hình?')) {
              editor.chain().setContent(starterContent, { errorOnInvalidContent: true }).setMeta('docs-direct-edit', true).run();
              state.setTitle('QA - Docs parity checklist (Project Atlas)');
            }
          }}><FileText size={18}/></button></>}
        <button className="docs-icon-button docs-search-trigger" aria-label="Search document" title={t('Search document')} onClick={() => window.dispatchEvent(new Event('docs-open-search'))}><Search size={18}/></button>
        <button className="docs-share-button docs-primary" aria-label="Share document copy" onClick={() => setShare(true)}><Share2 size={16}/><span>{t('Share')}</span></button>
        <ModeMenu editor={editor} readOnly={readOnly} onReadOnly={value => patchView({ mode: value ? 'read' : 'edit' })} onReview={review}/>
        <button className="docs-icon-button docs-comments-trigger" aria-label="Toggle comments" title={t('Comments')} aria-expanded={commentsOpen && !view.focus} aria-controls="docs-comments" onClick={onComments}><MessageSquare size={18}/>{count + reviewCount > 0 && <span className="docs-count">{count + reviewCount}</span>}</button>
        <PageSettings view={view} onChange={patchView} onHelp={onHelp}/>
        <DocumentTools editor={editor} revision={state.revision} title={state.title} comments={state.comments} onTitle={state.setTitle} onComments={state.setComments}/>
      </div>
    </header>
    {notice}<FindBar editor={editor}/>
    {view.focus && <button className="docs-focus-exit" onClick={() => patchView({ focus: false })}><ArrowLeft size={16}/>{t('Exit focus')}</button>}
    {(outlineOpen || commentsOpen) && !view.focus && <button className="docs-panel-backdrop" aria-label="Close document panels" onClick={closePanels}/>}
    <div className={`workspace docs-workspace ${outlineOpen && !view.focus ? 'with-outline' : ''} ${commentsOpen && !view.focus ? 'with-comments' : ''}`}>
      {outlineOpen && !view.focus && <aside id="docs-outline" className="docs-outline-panel" aria-label="Document navigation" onKeyDown={event => mobilePanel(event, onOutline)}><header><strong>{t('Outline')}</strong><button aria-label="Close outline" onClick={onOutline}><X size={16}/></button></header><WorkspaceOutline editor={editor}/></aside>}
      <section className="page docs-page"><DocumentHero editor={editor} title={state.title} onTitle={state.setTitle} status={state.status}/>{children}
        <footer className="page-footer docs-page-footer"><span>{words} {t('words')}<span aria-hidden="true"> &middot; </span>{Array.from(text).length} {t('characters')}</span>
          {!readOnly && <button onClick={() => { setPanel('comments'); onComment(); }}><MessageSquare size={14}/>{t('Add a comment')}</button>}</footer></section>
      {commentsOpen && !view.focus && <aside id="docs-comments" className="docs-comments-panel" aria-label="Document comments" onKeyDown={event => mobilePanel(event, onComments)}>
        <header><div className="docs-review-tabs" role="tablist" aria-label="Comments and suggestions" onKeyDown={event => {
          if (['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); const next = panel === 'comments' ? 'review' : 'comments'; setPanel(next); event.currentTarget.querySelector<HTMLButtonElement>(`[data-panel="${next}"]`)?.focus(); }
        }}><button role="tab" id="docs-comments-tab" data-panel="comments" aria-controls="docs-comments-body" aria-selected={panel === 'comments'} tabIndex={panel === 'comments' ? 0 : -1} onClick={() => setPanel('comments')}>{t('Comments')} {count || ''}</button>
          <button role="tab" id="docs-review-tab" data-panel="review" aria-controls="docs-review-body" aria-selected={panel === 'review'} tabIndex={panel === 'review' ? 0 : -1} onClick={() => setPanel('review')}>{t('Suggestions')} {reviewCount || ''}</button></div><button aria-label="Close comments" onClick={onComments}><X size={16}/></button></header>
        <div role="tabpanel" id="docs-comments-body" aria-labelledby="docs-comments-tab" hidden={panel !== 'comments'}><CommentsPanel editor={editor} comments={state.comments} onUpdate={state.setComments} readOnly={readOnly}/></div>
        <div role="tabpanel" id="docs-review-body" aria-labelledby="docs-review-tab" hidden={panel !== 'review'}><ReviewPanel editor={editor}/></div>
      </aside>}
    </div>
    <TableToolbar editor={editor} readOnly={readOnly}/><DocsEnhancements editor={editor} readOnly={readOnly} onOpen={() => {}}/>
    <BlockBatchBar editor={editor}/>{floating}
    {share && <ShareDialog editor={editor} title={state.title} comments={state.comments} onClose={() => setShare(false)}/>}
  </main>;
}
