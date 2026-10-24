export type Kind = 'text' | 'paragraph' | 'heading' | 'bulletList' | 'orderedList' | 'taskList' | 'blockquote' | 'callout' | 'codeBlock' | 'horizontalRule' | 'image' | 'table' | 'cell' | 'link' | 'columns' | 'taskItem' | 'toggleBlock' | 'pageBreak' | 'inlineSheet' | 'docsToc' | 'docsTimeline' | 'docsMermaid' | 'imageGallery' | 'mediaBlock' | 'equation' | 'inlineEquation' | 'syncedBlock';
export type Action = 'paragraph' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'h7' | 'h8' | 'h9' | 'bullet' | 'numbered' | 'task' | 'quote' | 'callout' | 'code' | 'divider' | 'image' | 'table' | 'columns' | 'columns-3' | 'columns-4' | 'duplicate' | 'delete' | 'insert-below' | 'comment' | 'copy' | 'align-left' | 'align-center' | 'align-right' | 'indent' | 'outdent' | 'link-edit' | 'link-copy' | 'link-remove' | 'link-open' | 'image-edit' | 'image-download' | 'image-copy' | 'row-add' | 'row-delete' | 'col-add' | 'col-delete' | 'table-delete' | 'merge-cells' | 'split-cell' | 'header-row' | 'header-column' | 'header-cell' | 'row-before' | 'col-before' | 'toggle-task' | 'block-link' | 'move-up' | 'move-down' | 'templates' | 'template-save' | 'block-style' | 'image-crop' | 'toggle' | 'page-break' | 'image-preview' | 'image-comment' | 'sheets' | 'toc' | 'timeline' | 'mermaid' | 'image-gallery' | 'file' | 'audio' | 'video' | 'web-card' | 'equation' | 'inline-equation' | 'synced' | 'template-meeting' | 'template-plan' | 'template-weekly' | 'template-swot' | 'template-implementation' | 'templates-gallery';
export type Item = { id: Action; label: string; shortcut?: string; destructive?: boolean };
const I = (id: Action, label: string): Item => ({ id, label, destructive: ['delete','table-delete','row-delete','col-delete'].includes(id) });
export const insertItems: Item[] = [
  I('paragraph','Text'), ...([1,2,3,4,5,6,7,8,9] as const).map(level => I(`h${level}`,'Heading ' + level)),
  I('bullet','Bullet list'), I('numbered','Numbered list'), I('task','Checklist'), I('quote','Quote'), I('callout','Callout'), I('toggle','Toggle details'),
  I('image','Image'), I('image-gallery','Image gallery'), I('file','File attachment'), I('audio','Audio'), I('video','Video'), I('web-card','Web card'),
  I('table','Table'), I('columns','2 columns'), I('columns-3','3 columns'), I('columns-4','4 columns'), I('divider','Divider'), I('page-break','Page break'),
  I('code','Code block'), I('equation','Equation'), I('inline-equation','Inline equation'), I('sheets','Sheets'), I('toc','Table of Contents'), I('timeline','Timeline'), I('mermaid','Mermaid'), I('synced','Synced block'),
  I('templates','Block templates'), I('template-meeting','Meeting Notes'), I('template-plan','Project Plan'), I('template-weekly','Weekly Report'), I('template-swot','SWOT Mind Map'), I('template-implementation','Project Planning and Implementation'), I('templates-gallery','Template gallery'),
];
export const conversionIds = new Set<Action>(['paragraph','h1','h2','h3','h4','h5','h6','h7','h8','h9','bullet','numbered','task','quote','callout','code']);
const template = I('template-save','Save to My Templates');
const shared = [I('insert-below','Insert below'), I('duplicate','Duplicate'), I('copy','Copy content'), template, I('block-link','Copy link to block'), I('move-up','Move block up'), I('move-down','Move block down'), I('comment','Comment')];
export function actionsFor(kind: Kind): Item[] {
  switch (kind) {
    case 'link': return [I('link-open','Open link'), I('link-edit','Edit link'), I('link-copy','Copy URL'), I('link-remove','Remove link')];
    case 'taskItem': return [I('toggle-task','Toggle checked'), I('indent','Indent'), I('outdent','Outdent'), ...shared, I('delete','Delete task')];
    case 'toggleBlock': return [...shared, I('delete','Delete toggle')];
    case 'pageBreak': return [I('insert-below','Insert below'), I('duplicate','Duplicate'), I('delete','Delete page break')];
    case 'table': case 'cell': return [I('row-before','Insert row above'), I('row-add','Insert row below'), I('row-delete','Delete row'), I('col-before','Insert column left'), I('col-add','Insert column right'), I('col-delete','Delete column'), I('merge-cells','Merge selected cells'), I('split-cell','Split merged cell'), I('header-row','Toggle header row'), I('header-column','Toggle header column'), I('header-cell','Toggle header cell'), I('align-left','Align left'), I('align-center','Align center'), I('align-right','Align right'), I('copy','Copy'), I('comment','Comment'), template, I('table-delete','Delete table')];
    case 'image': return [I('image-preview','Preview image'), I('image-edit','Caption, replace or resize'), I('image-crop','Crop image'), I('image-comment','Comment on image'), I('image-copy','Copy image URL'), I('image-download','Download image'), I('duplicate','Duplicate'), template, I('block-link','Copy link to block'), I('insert-below','Insert below'), I('delete','Delete image')];
    case 'inlineSheet': case 'docsToc': case 'docsTimeline': case 'docsMermaid': case 'mediaBlock': case 'imageGallery': case 'equation': case 'inlineEquation': case 'syncedBlock': return [I('insert-below','Insert below'), I('duplicate','Duplicate'), template, I('block-link','Copy link to block'), I('delete','Delete block')];
    case 'horizontalRule': return [I('insert-below','Insert below'), I('duplicate','Duplicate'), I('delete','Delete divider')];
    case 'columns': return [I('insert-below','Insert below'), I('duplicate','Duplicate'), template, I('block-link','Copy link to block'), I('delete','Delete columns')];
    case 'codeBlock': return [I('paragraph','Turn into text'), I('copy','Copy code'), template, I('duplicate','Duplicate'), I('insert-below','Insert below'), I('delete','Delete block')];
    default: return [...insertItems.filter(item => conversionIds.has(item.id)), I('block-style','Block color and indent'),
      ...(['paragraph','heading','text'].includes(kind) ? [I('align-left','Align left'), I('align-center','Align center'), I('align-right','Align right')] : []),
      ...(['bulletList','orderedList','taskList'].includes(kind) ? [I('indent','Indent'), I('outdent','Outdent')] : []), ...shared, I('delete','Delete block')];
  }
}
export const kindFor = (name: string): Kind => (['paragraph','heading','bulletList','orderedList','taskList','blockquote','callout','codeBlock','horizontalRule','image','table','columns','taskItem','toggleBlock','pageBreak','inlineSheet','docsToc','docsTimeline','docsMermaid','imageGallery','mediaBlock','equation','inlineEquation','syncedBlock'].includes(name) ? name : 'text') as Kind;
export function slashQuery(text: string): string | null { const match = /^\s*\/([\p{L}\p{N} _-]{0,40})$/u.exec(text); return match ? match[1].trim().toLowerCase() : null; }
const plain = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\u0111/gi,'d').toLowerCase();
const searchWords: Partial<Record<Action, string>> = { paragraph:'van ban doan chu',h1:'tieu de 1',h2:'tieu de 2',h3:'tieu de 3',h4:'tieu de 4',h5:'tieu de 5',h6:'tieu de 6',h7:'tieu de 7',h8:'tieu de 8',h9:'tieu de 9',bullet:'danh sach dau dong',numbered:'danh sach so',task:'viec can lam danh sach kiem tra',quote:'trich dan',callout:'ghi chu luu y canh bao',toggle:'thu gon chi tiet',image:'anh hinh', 'image-gallery':'bo anh luoi hinh', file:'tep dinh kem',audio:'am thanh',video:'phim', 'web-card':'the trang web lien ket',table:'bang',columns:'cot bo cuc', 'columns-3':'cot bo cuc', 'columns-4':'cot bo cuc',equation:'cong thuc toan', 'inline-equation':'cong thuc noi tuyen',sheets:'bang tinh sheet',code:'ma nguon',toc:'muc luc',timeline:'dong thoi gian',synced:'dong bo khoi',divider:'duong phan cach', 'page-break':'ngat trang' };
export const filterInserts = (query: string) => { const term = plain(query.trim());
  if (term === 'mau' || term === 'template') return insertItems.filter(item => item.id.startsWith('template-') || item.id === 'templates-gallery');
  if (term === 'head') return insertItems.filter(item => ['h1','h2','h3'].includes(item.id));
  if (term === 'columns') return insertItems.filter(item => item.id === 'columns');
  return insertItems.filter(item => plain(`${item.label} ${searchWords[item.id] || ''}`).includes(term)); };
export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export function placeOverlay(p: Point, s: Size, v: Size, gap = 8): Point { return { x: Math.max(gap, Math.min(p.x, v.width - s.width - gap)), y: Math.max(gap, Math.min(p.y, v.height - s.height - gap)) }; }
