export type CodeToken = { from: number; to: number; kind: 'comment' | 'string' | 'number' | 'keyword' | 'property' };
export const codeLanguages = [
  ['plaintext', 'Plain text'], ['javascript', 'JavaScript'], ['typescript', 'TypeScript'], ['json', 'JSON'],
  ['python', 'Python'], ['sql', 'SQL'], ['css', 'CSS'], ['bash', 'Bash'], ['html', 'HTML'], ['xml', 'XML'],
] as const;
const aliases: Record<string, string> = { js: 'javascript', ts: 'typescript', py: 'python', sh: 'bash', text: 'plaintext' };
export function normalizeLanguage(value: unknown): string {
  const text = typeof value === 'string' ? value.toLowerCase() : '';
  return aliases[text] || (codeLanguages.some(([key]) => key === text) ? text : 'plaintext');
}
const words: Record<string, Set<string>> = {
  javascript: new Set('const let var function return if else switch case break for while do try catch finally throw new class extends import export default from async await true false null undefined this typeof instanceof in of yield'.split(' ')),
  typescript: new Set('interface type enum implements public private protected readonly abstract declare namespace as keyof infer never unknown string number boolean any void'.split(' ')),
  python: new Set('def class return if elif else for while in is not and or True False None import from as try except finally raise with lambda yield pass break continue async await'.split(' ')),
  sql: new Set('SELECT FROM WHERE JOIN LEFT RIGHT INNER OUTER ON AS AND OR NOT NULL INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE DROP GROUP BY ORDER HAVING DISTINCT LIMIT OFFSET ASC DESC CASE WHEN THEN ELSE END UNION ALL'.split(' ')),
  bash: new Set('if then else elif fi for do done while in function case esac export echo exit local return'.split(' ')),
};
/** Conservative syntax coloring only, never eval/HTML. Unrecognized text stays unstyled. */
export function tokenizeCode(text: string, rawLanguage: unknown): CodeToken[] {
  const language = normalizeLanguage(rawLanguage);
  if (language === 'plaintext' || text.length > 100000) return [];
  const tokens: CodeToken[] = [];
  const add = (from: number, to: number, kind: CodeToken['kind']) => { if (to > from) tokens.push({ from, to, kind }); };
  let i = 0;
  while (i < text.length && tokens.length < 12000) {
    const start = i, c = text[i], tail = text.slice(i);
    const hashComment = ['python', 'bash'].includes(language) && c === '#';
    const lineComment = ['javascript', 'typescript'].includes(language) && tail.startsWith('//');
    const sqlComment = language === 'sql' && tail.startsWith('--');
    if (hashComment || lineComment || sqlComment) {
      i = text.indexOf('\n', i); if (i < 0) i = text.length; add(start, i, 'comment'); continue;
    }
    if ((['javascript', 'typescript', 'css', 'sql'].includes(language) && tail.startsWith('/*')) ||
      (['html', 'xml'].includes(language) && tail.startsWith('<!--'))) {
      const ending = tail.startsWith('<!--') ? '-->' : '*/';
      const end = text.indexOf(ending, i + 2); i = end < 0 ? text.length : end + ending.length;
      add(start, i, 'comment'); continue;
    }
    if (c === '"' || c === "'" || (c === '`' && ['javascript', 'typescript', 'bash'].includes(language))) {
      const triple = language === 'python' && text.slice(i, i + 3) === c.repeat(3);
      const quote = triple ? c.repeat(3) : c; i += quote.length;
      while (i < text.length) {
        if (text[i] === '\\') { i = Math.min(text.length, i + 2); continue; }
        if (text.slice(i, i + quote.length) === quote) { i += quote.length; break; }
        if (!triple && c !== '`' && text[i] === '\n') break;
        i++;
      }
      add(start, i, language === 'json' && /^\s*:/.test(text.slice(i)) ? 'property' : 'string'); continue;
    }
    const digit = /^(?:0[xX][\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(tail);
    if (digit && !/[\w$]/.test(text[i - 1] || '')) { i += digit[0].length; add(start, i, 'number'); continue; }
    const word = /^[\w$-]+/.exec(tail);
    if (word) {
      i += word[0].length;
      const value = language === 'sql' ? word[0].toUpperCase() : word[0];
      if (words[language]?.has(value) || language === 'typescript' && words.javascript.has(value) ||
        language === 'json' && ['true', 'false', 'null'].includes(value)) add(start, i, 'keyword');
      else if (language === 'css' && /^\s*:/.test(text.slice(i))) add(start, i, 'property');
      else if (['html', 'xml'].includes(language) && /[</]/.test(text[start - 1] || '')) add(start, i, 'keyword');
      continue;
    }
    i++;
  }
  return tokens;
}
