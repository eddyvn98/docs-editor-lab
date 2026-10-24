import { mathSymbols, mathFunctions, mathFonts } from './mathSymbols';
const NS = 'http://www.w3.org/1998/Math/MathML';
function element(name: string, children: (Element | string)[] = [], attrs: Record<string, string> = {}): Element {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  for (const child of children) node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  return node;
}
/** Bounded TeX-to-native-MathML renderer. Unsupported commands fail visibly, retaining source. */
export function renderMath(source: string, display = false): Element {
  if (source.length > 10_000) throw new Error('Equation source is limited to 10,000 characters.');
  const matches = Array.from(source.matchAll(/\\[a-zA-Z]+|\\.|[0-9]+(?:\.[0-9]+)?|[^\s]/gu));
  const tokens = matches.map(match => match[0]);
  if (tokens.length > 4000) throw new Error('This equation is too complex.');
  let index = 0, depth = 0;
  const take = () => tokens[index++] || '', peek = () => tokens[index] || '';
  const expect = (value: string) => { if (take() !== value) throw new Error(`Expected ${value}.`); };
  const rawGroup = () => {
    expect('{'); const begin = matches[index - 1].index! + 1; let level = 1;
    while (index < tokens.length && level) { const value = take(); if (value === '{') level++; if (value === '}') level--; }
    if (level) throw new Error('Close the text group with }.'); return source.slice(begin, matches[index - 1].index);
  };
  const row = (stops: string[] = []): Element => {
    if (++depth > 60) throw new Error('Equation nesting is too deep.');
    const children: Element[] = [];
    while (index < tokens.length && !stops.includes(peek())) {
      let base = atom(), sub: Element | null = null, sup: Element | null = null;
      while (['\\limits', '\\nolimits'].includes(peek())) take();
      while (peek() === '_' || peek() === '^') { const type = take(); const value = atom(); if (type === '_') sub = value; else sup = value; }
      if (sub && sup) base = element('msubsup', [base, sub, sup]);
      else if (sub || sup) base = element(sub ? 'msub' : 'msup', [base, (sub || sup)!]);
      children.push(base);
    }
    depth--; return children.length === 1 ? children[0] : element('mrow', children);
  };
  const atom = (): Element => {
    const value = take();
    if (!value) throw new Error('An equation argument is missing.');
    if (value === '{') { const body = row(['}']); expect('}'); return body; }
    if (value === '}' || value === '^' || value === '_') throw new Error(`Unexpected ${value}.`);
    if (!value.startsWith('\\')) return element(/^\d/.test(value) ? 'mn' : /^\p{L}$/u.test(value) ? 'mi' : 'mo', [value]);
    const command = value.slice(1);
    if (['frac', 'dfrac', 'tfrac', 'binom'].includes(command)) {
      const fraction = element('mfrac', [atom(), atom()], command === 'binom' ? { linethickness: '0' } : {});
      return command === 'binom' ? element('mrow', [element('mo', ['(']), fraction, element('mo', [')'])]) : fraction;
    }
    if (command === 'sqrt') {
      let root: Element | undefined;
      if (peek() === '[') { take(); root = row([']']); expect(']'); }
      const body = atom(); return root ? element('mroot', [body, root]) : element('msqrt', [body]);
    }
    if (command === 'text' || command === 'operatorname') return element(command === 'text' ? 'mtext' : 'mi', [rawGroup().replace(/\\([{}_\s])/g, '$1')], { mathvariant: 'normal' });
    if (mathFonts[command]) return element('mstyle', [atom()], { mathvariant: mathFonts[command] });
    if (['overline','bar','hat','widehat','tilde','widetilde','vec','dot','ddot','underline','underbrace','overbrace'].includes(command)) {
      const accents: Record<string, string> = { overline:'\u00af',bar:'\u00af',hat:'^',widehat:'^',tilde:'~',widetilde:'~',vec:'\u2192',dot:'\u02d9',ddot:'\u00a8',underline:'_',underbrace:'\u23df',overbrace:'\u23de' };
      return element(command.startsWith('under') ? 'munder' : 'mover', [atom(), element('mo', [accents[command]])], { accent: 'true' });
    }
    if (command === 'overset' || command === 'underset') { const script = atom(), base = atom(); return element(command === 'overset' ? 'mover' : 'munder', [base, script]); }
    if (command === 'boxed') return element('menclose', [atom()], { notation: 'box' });
    if (command === 'begin') {
      const environment = rawGroup();
      if (!['matrix','pmatrix','bmatrix','Bmatrix','vmatrix','Vmatrix','cases','aligned','array'].includes(environment)) throw new Error(`Unsupported environment: ${environment}.`);
      if (environment === 'array' && peek() === '{') rawGroup();
      const rows: Element[] = []; let cells: Element[] = [];
      while (index < tokens.length && peek() !== '\\end') {
        cells.push(element('mtd', [row(['&', '\\\\', '\\end'])]));
        if (peek() === '&') { take(); continue; }
        rows.push(element('mtr', cells)); cells = [];
        if (peek() === '\\\\') take(); else break;
      }
      if (cells.length) rows.push(element('mtr', cells));
      expect('\\end'); if (rawGroup() !== environment) throw new Error('Matrix environment names must match.');
      const table = element('mtable', rows, environment === 'cases' || environment === 'aligned' ? { columnalign: 'left' } : {});
      const fences: Record<string, [string, string]> = { pmatrix:['(',')'],bmatrix:['[',']'],Bmatrix:['{','}'],vmatrix:['|','|'],Vmatrix:['\u2016','\u2016'],cases:['{',''] };
      const pair = fences[environment]; return pair ? element('mrow', [element('mo', [pair[0]], { stretchy: 'true' }), table, element('mo', [pair[1]], { stretchy: 'true' })]) : table;
    }
    if (['left','right','big','Big','bigg','Bigg','bigl','bigr','Bigl','Bigr'].includes(command)) { if (peek() === '.') { take(); return element('mrow'); } return atom(); }
    if (['displaystyle','textstyle','scriptstyle','limits','nolimits'].includes(command)) return peek() ? atom() : element('mrow');
    if ([',',';',':','!','quad','qquad',' '].includes(command)) return element('mspace', [], { width: command === 'quad' ? '1em' : command === 'qquad' ? '2em' : command === '!' ? '-0.15em' : '0.25em' });
    if (['{','}','%','$','#','_','&','|'].includes(command)) return element('mo', [command]);
    if (mathSymbols[command]) return element(/^[a-zA-Z]*[a-z]$/.test(command) && /^[\u0370-\u03ff]$/.test(mathSymbols[command]) ? 'mi' : 'mo', [mathSymbols[command]]);
    if (mathFunctions.has(command)) return element('mi', [command], { mathvariant: 'normal' });
    throw new Error(`Unsupported command: \\${command}. The source is preserved.`);
  };
  const content = row();
  return element('math', [element('semantics', [content, element('annotation', [source], { encoding: 'application/x-tex' })])], { display: display ? 'block' : 'inline', 'aria-label': source });
}
