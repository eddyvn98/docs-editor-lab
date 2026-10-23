export type SlashMatch = { query: string; from: number; to: number; wholeLine: boolean };
/** Match only the command immediately before the caret; offsets are UTF-16, as in ProseMirror. */
export function findSlash(text: string, caret = text.length): SlashMatch | null {
  if (!Number.isInteger(caret) || caret < 0 || caret > text.length) return null;
  const before = text.slice(0, caret);
  const match = /(?:^|[\t \u00a0])\/([\p{L}\p{N}_ -]{0,40})$/u.exec(before);
  if (!match) return null;
  const from = match.index + (match[0][0] === '/' ? 0 : 1);
  const query = match[1].trim().toLocaleLowerCase();
  return { query, from, to: caret, wholeLine: !text.slice(0, from).trim() && !text.slice(caret).trim() };
}
