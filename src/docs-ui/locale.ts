import { useSyncExternalStore } from 'react';
export type DocsLocale = 'en' | 'vi';
const listeners = new Set<() => void>();
let current: DocsLocale | undefined;
export function getLocale(): DocsLocale {
  if (current) return current;
  try { const saved = localStorage.getItem('docs-editor-locale'); if (saved === 'en' || saved === 'vi') return current = saved; } catch { /* Browser preference is a safe fallback. */ }
  return current = typeof navigator !== 'undefined' && navigator.language.startsWith('vi') ? 'vi' : 'en';
}
export function setLocale(value: DocsLocale) {
  current = value;
  try { localStorage.setItem('docs-editor-locale', value); } catch { /* The choice still applies to this tab. */ }
  listeners.forEach(listener => listener());
}
export function useDocsLocale() {
  return useSyncExternalStore(callback => { listeners.add(callback); return () => listeners.delete(callback); }, getLocale, () => 'en' as const);
}
const vi: Record<string, string> = {
  Docs: 'T\u00e0i li\u1ec7u', Outline: 'M\u1ee5c l\u1ee5c', Comments: 'B\u00ecnh lu\u1eadn',
  Share: 'Chia s\u1ebb', Editing: 'Ch\u1ec9nh s\u1eeda', Reading: '\u0110\u1ecdc', Suggesting: '\u0110\u1ec1 xu\u1ea5t',
  'Saved locally': '\u0110\u00e3 l\u01b0u tr\u00ean thi\u1ebft b\u1ecb', 'Saving...': '\u0110ang l\u01b0u...', 'Not saved': 'Ch\u01b0a l\u01b0u',
  Ready: 'S\u1eb5n s\u00e0ng', Conflict: 'Xung \u0111\u1ed9t b\u1ea3n l\u01b0u', You: 'B\u1ea1n', Untitled: 'T\u00e0i li\u1ec7u kh\u00f4ng c\u00f3 ti\u00eau \u0111\u1ec1',
  'Add icon': 'Th\u00eam bi\u1ec3u t\u01b0\u1ee3ng', 'Add cover': 'Th\u00eam \u1ea3nh b\u00eca', 'Change cover': '\u0110\u1ed5i \u1ea3nh b\u00eca',
  Reposition: '\u0110\u1ed5i v\u1ecb tr\u00ed', Remove: 'X\u00f3a', Cancel: 'H\u1ee7y', Save: 'L\u01b0u', Close: '\u0110\u00f3ng',
  'Document icon': 'Bi\u1ec3u t\u01b0\u1ee3ng t\u00e0i li\u1ec7u', 'Document cover': '\u1ea2nh b\u00eca t\u00e0i li\u1ec7u', Upload: 'T\u1ea3i l\u00ean',
  Insert: 'Ch\u00e8n', Templates: 'M\u1eabu', 'Search document': 'T\u00ecm trong t\u00e0i li\u1ec7u', 'Page settings': 'C\u00e0i \u0111\u1eb7t trang',
  'Document settings': 'C\u00e0i \u0111\u1eb7t t\u00e0i li\u1ec7u', 'Full width': 'To\u00e0n b\u1ed9 chi\u1ec1u r\u1ed9ng', 'Focus mode': 'Ch\u1ebf \u0111\u1ed9 t\u1eadp trung',
  'Exit focus': 'Tho\u00e1t t\u1eadp trung', Appearance: 'Giao di\u1ec7n', Light: 'S\u00e1ng', Dark: 'T\u1ed1i', Language: 'Ng\u00f4n ng\u1eef',
  Font: 'Ph\u00f4ng ch\u1eef', 'Font size': 'C\u1ee1 ch\u1eef', 'Keyboard shortcuts': 'Ph\u00edm t\u1eaft',
  'Local document': 'T\u00e0i li\u1ec7u tr\u00ean thi\u1ebft b\u1ecb', words: 't\u1eeb', characters: 'k\u00fd t\u1ef1',
  'Expand all': 'M\u1edf r\u1ed9ng t\u1ea5t c\u1ea3', 'Collapse all': 'Thu g\u1ecdn t\u1ea5t c\u1ea3',
  'No comments yet': 'Ch\u01b0a c\u00f3 b\u00ecnh lu\u1eadn', 'Add a comment': 'Th\u00eam b\u00ecnh lu\u1eadn',
  Reply: 'Tr\u1ea3 l\u1eddi', Resolve: 'Gi\u1ea3i quy\u1ebft', Reopen: 'M\u1edf l\u1ea1i', Resolved: '\u0110\u00e3 gi\u1ea3i quy\u1ebft',
  Send: 'G\u1eedi', Delete: 'X\u00f3a', Edit: 'S\u1eeda', All: 'T\u1ea5t c\u1ea3', Open: 'Ch\u01b0a gi\u1ea3i quy\u1ebft',
  'Send a copy': 'G\u1eedi b\u1ea3n sao', 'Download JSON': 'T\u1ea3i b\u1ea3n JSON', 'Download HTML': 'T\u1ea3i b\u1ea3n HTML', 'Print / PDF': 'In / PDF',
  'Search blocks': 'T\u00ecm kh\u1ed1i n\u1ed9i dung', 'Insert a block': 'Ch\u00e8n n\u1ed9i dung',
  "Type '/' for commands": "Nh\u1eadp '/' cho c\u00e1c l\u1ec7nh",
  'Basic blocks': 'N\u1ed9i dung c\u01a1 b\u1ea3n', 'Common blocks': 'Th\u01b0\u1eddng d\u00f9ng', 'Search results': 'K\u1ebft qu\u1ea3 t\u00ecm ki\u1ebfm', Actions: 'Thao t\u00e1c',
  Media: '\u0110a ph\u01b0\u01a1ng ti\u1ec7n', Layout: 'B\u1ed1 c\u1ee5c', Advanced: 'N\u00e2ng cao',
  Text: 'V\u0103n b\u1ea3n', 'Text style and blocks': 'Ki\u1ec3u v\u0103n b\u1ea3n v\u00e0 kh\u1ed1i', 'Heading 1': 'Ti\u00eau \u0111\u1ec1 1', 'Heading 2': 'Ti\u00eau \u0111\u1ec1 2', 'Heading 3': 'Ti\u00eau \u0111\u1ec1 3',
  'Heading 4': 'Ti\u00eau \u0111\u1ec1 4', 'Heading 5': 'Ti\u00eau \u0111\u1ec1 5', 'Heading 6': 'Ti\u00eau \u0111\u1ec1 6', 'Heading 7': 'Ti\u00eau \u0111\u1ec1 7', 'Heading 8': 'Ti\u00eau \u0111\u1ec1 8', 'Heading 9': 'Ti\u00eau \u0111\u1ec1 9',
  'Bullet list': 'Danh s\u00e1ch d\u1ea5u \u0111\u1ea7u d\u00f2ng', 'Numbered list': 'Danh s\u00e1ch \u0111\u00e1nh s\u1ed1', Checklist: 'Danh s\u00e1ch ki\u1ec3m tra',
  'Text alignment': 'C\u0103n l\u1ec1', 'Align left': 'C\u0103n tr\u00e1i', 'Align center': 'C\u0103n gi\u1eefa', 'Align right': 'C\u0103n ph\u1ea3i',
  'Increase indent': 'T\u0103ng th\u1ee5t l\u1ec1', 'Decrease indent': 'Gi\u1ea3m th\u1ee5t l\u1ec1',
  Quote: 'Tr\u00edch d\u1eabn', Callout: '\u00d4 nh\u1ea5n m\u1ea1nh', 'Code block': 'Kh\u1ed1i m\u00e3', Divider: '\u0110\u01b0\u1eddng ph\u00e2n c\u00e1ch',
  Image: 'H\u00ecnh \u1ea3nh', Table: 'B\u1ea3ng', '2 columns': '2 c\u1ed9t', '3 columns': '3 c\u1ed9t', '4 columns': '4 c\u1ed9t',
  'Image gallery': 'B\u1ed1 c\u1ee5c \u1ea3nh', Equation: 'C\u00f4ng th\u1ee9c', 'Inline equation': 'C\u00f4ng th\u1ee9c trong d\u00f2ng',
  Attachment: 'T\u1ec7p \u0111\u00ednh k\u00e8m', Audio: '\u00c2m thanh', Video: 'Video', 'Web card': 'Th\u1ebb trang web',
  'Synced block': 'Kh\u1ed1i \u0111\u1ed3ng b\u1ed9', 'Toggle details': 'N\u1ed9i dung thu g\u1ecdn', 'Page break': 'Ng\u1eaft trang',
  'Table of Contents': 'M\u1ee5c l\u1ee5c', Timeline: 'D\u00f2ng th\u1eddi gian', 'Block templates': 'M\u1eabu kh\u1ed1i',
  'No matching blocks': 'Kh\u00f4ng c\u00f3 n\u1ed9i dung ph\u00f9 h\u1ee3p', Rows: 'H\u00e0ng', Columns: 'C\u1ed9t',
  'Find in document': 'T\u00ecm trong t\u00e0i li\u1ec7u', Replace: 'Thay th\u1ebf', 'Replace all': 'Thay th\u1ebf t\u1ea5t c\u1ea3', 'No results': 'Kh\u00f4ng c\u00f3 k\u1ebft qu\u1ea3',
  'Review suggestions': 'Duy\u1ec7t \u0111\u1ec1 xu\u1ea5t', Accept: 'Ch\u1ea5p nh\u1eadn', Reject: 'T\u1eeb ch\u1ed1i',
};
export const t = (message: string) => getLocale() === 'vi' ? vi[message] || message : message;
