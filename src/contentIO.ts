import type { Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import { safeImage, safeLink, escapeHTML, clampImageWidth } from './safety';
import { isDocument } from './documentUtils';
import { safeMediaURL, validAssetId } from './docs-content/assets';
export function validateDocument(value: unknown, editor: Pick<Editor, 'schema'>): JSONContent {
  if (!isDocument(value)) throw new Error('This file is not a TipTap document.');
  let count = 0;
  function visit(item: unknown, depth: number, insideSync = false): void {
    if (depth > 60 || ++count > 30000) throw new Error('Document is too complex to import safely.');
    if (!item || typeof item !== 'object') throw new Error('Invalid document node.');
    const node = item as JSONContent;
    if (typeof node.type !== 'string' || !editor.schema.nodes[node.type]) throw new Error('Unsupported node type.');
    if (node.type === 'image' && !safeImage(String(node.attrs?.src || ''))) throw new Error('Unsafe image URL.');
    if (node.type === 'heading' && (!Number.isInteger(node.attrs?.level ?? 1) || Number(node.attrs?.level ?? 1) < 1 || Number(node.attrs?.level ?? 1) > 9)) throw new Error('Headings must use levels 1 to 9.');
    if (node.type === 'mediaBlock') {
      const kind = String(node.attrs?.kind || 'file');
      if (!['file','audio','video','web'].includes(kind)) throw new Error('Unsupported media kind.');
      if (node.attrs?.src && !safeMediaURL(node.attrs.src, kind)) throw new Error('Unsafe media URL.');
      if (node.attrs?.assetId && !validAssetId(node.attrs.assetId)) throw new Error('Invalid attachment reference.');
    }
    if (node.type === 'equation' || node.type === 'inlineEquation') { if (typeof (node.attrs?.latex ?? '') !== 'string' || String(node.attrs?.latex || '').length > 10000) throw new Error('Equation source is too long.'); }
    if (node.type === 'syncedBlock' && insideSync) throw new Error('Synced blocks cannot contain other synced blocks.');
    if (node.type === 'syncedBlock' && node.attrs?.syncId && !validAssetId(node.attrs.syncId)) throw new Error('Invalid synced block reference.');
    if (node.attrs?.reviewId && (!validAssetId(node.attrs.reviewId) || !['insert','delete'].includes(String(node.attrs.reviewKind)))) throw new Error('Invalid suggested change.');
    if (node.type === 'doc' && node.attrs?.docsCover && !['mist','ocean','meadow','sunrise','dusk','paper'].includes(String(node.attrs.docsCover)) && !safeImage(String(node.attrs.docsCover))) throw new Error('Unsafe document cover.');
    if (node.marks) {
      if (!Array.isArray(node.marks)) throw new Error('Invalid marks.');
      for (const mark of node.marks) {
        if (!editor.schema.marks[mark.type]) throw new Error('Unsupported text mark.');
        if (mark.type === 'link' && !safeLink(String(mark.attrs?.href || ''))) throw new Error('Unsafe link URL.');
        if (mark.type === 'suggestion' && (!validAssetId(mark.attrs?.id) || !['insert','delete'].includes(String(mark.attrs?.kind)))) throw new Error('Invalid text suggestion.');
      }
    }
    if (node.content !== undefined) { if (!Array.isArray(node.content)) throw new Error('Invalid node content.'); node.content.forEach(child => visit(child, depth + 1, insideSync || node.type === 'syncedBlock')); }
  }
  visit(value, 0); const node = editor.schema.nodeFromJSON(value); node.check(); return node.toJSON() as JSONContent;
}
export function sanitizeHTML(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,form,base,meta,link,foreignObject').forEach(element => element.remove());
  doc.body.querySelectorAll('*').forEach(element => {
    for (const attribute of Array.from(element.attributes)) if (/^on/i.test(attribute.name) || ['srcdoc','srcset','formaction'].includes(attribute.name)) element.removeAttribute(attribute.name);
    if (element.hasAttribute('href') && !safeLink(element.getAttribute('href')!) && !(element.matches('a[data-doc-file]') && safeMediaURL(element.getAttribute('href'), 'file'))) element.removeAttribute('href');
    if (element.hasAttribute('xlink:href') && !safeLink(element.getAttribute('xlink:href')!)) element.removeAttribute('xlink:href');
    if (element.hasAttribute('src')) { const valid = element.matches('audio,video,source') ? safeMediaURL(element.getAttribute('src'), element.tagName.toLowerCase()) : safeImage(element.getAttribute('src')!); if (!valid) element.removeAttribute('src'); }
    if (element.hasAttribute('data-width')) element.setAttribute('data-width', clampImageWidth(element.getAttribute('data-width')));
    if (/url\s*\(|expression\s*\(|@import/i.test(element.getAttribute('style') || '')) element.removeAttribute('style');
  });
  // Preserve ordinary HTML media and checklists when pasting from other editors.
  doc.querySelectorAll('audio,video').forEach(element => {
    if (element.closest('[data-type="mediaBlock"]')) return;
    const kind = element.tagName.toLowerCase(), src = safeMediaURL(element.getAttribute('src') || element.querySelector('source')?.getAttribute('src'), kind); if (!src) return;
    const figure = doc.createElement('figure'); figure.dataset.type = 'mediaBlock'; figure.dataset.kind = kind; figure.dataset.src = src; figure.dataset.label = element.getAttribute('title') || kind;
    element.replaceWith(figure); figure.append(element);
  });
  doc.querySelectorAll('li').forEach(item => {
    const checkbox = item.querySelector('input[type="checkbox"]');
    if (!checkbox || checkbox.closest('li') !== item) return;
    item.setAttribute('data-type','taskItem'); item.setAttribute('data-checked', String(checkbox.hasAttribute('checked')));
    if (item.parentElement?.tagName === 'UL') item.parentElement.setAttribute('data-type','taskList');
  });
  return doc.body.innerHTML;
}
export function exportHTML(editor: Editor, title: string, bodyHTML = editor.getHTML(), attrs = editor.state.doc.attrs): string {
  const icon = String(attrs.docsIcon || ''), cover = safeImage(String(attrs.docsCover || ''));
  const style = 'body{max-width:920px;margin:40px auto;padding:24px;font:16px/1.65 system-ui;color:#1f2329}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #d9dfe7;padding:8px}pre{white-space:pre-wrap;background:#f5f6f7;padding:16px}blockquote{border-left:3px solid #aaa;padding-left:16px}[data-type=columns]{display:grid;gap:24px}[data-type=column]{min-width:0}.docs-media-block{border:1px solid #ddd;padding:16px;border-radius:6px}audio,video{width:100%}math[display=block]{overflow:auto;margin:16px 0}ins{color:#168351;background:#e3f5e8;text-decoration:none}del{color:#bc3d3d;background:#ffe8e7}[data-reviewkind=insert]{border-left:3px solid #168351;padding-left:10px}[data-reviewkind=delete]{border-left:3px solid #bc3d3d;opacity:.7;padding-left:10px}.document-cover{width:100%;max-height:260px;object-fit:cover}[data-type=pageBreak]{break-after:page}@media(max-width:600px){[data-type=columns],[data-type=imageGallery]{display:block!important}}';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHTML(title)}</title><style>${style}</style></head><body>${cover ? `<img class="document-cover" src="${escapeHTML(cover)}" alt="">` : ''}<h1 data-document-title>${icon ? `${escapeHTML(icon)} ` : ''}${escapeHTML(title)}</h1>${sanitizeHTML(bodyHTML)}</body></html>`;
}
