export type OutlineBlock = { pos: number; size: number; type: string; text: string; id?: string; level?: number };
export type HeadingSection = { id: string; pos: number; bodyFrom: number; end: number; level: number; text: string; parentId: string | null };

/** A section stops before the next heading of equal or higher rank. */
export function headingSections(blocks: OutlineBlock[], end: number): HeadingSection[] {
  const headings: HeadingSection[] = [];
  const stack: HeadingSection[] = [];
  for (const block of blocks) {
    if (block.type !== 'heading') continue;
    const level = Math.min(6, Math.max(1, block.level || 1));
    while (stack.length && stack[stack.length - 1].level >= level) stack.pop()!.end = block.pos;
    const entry: HeadingSection = { id: block.id || `heading-${block.pos}`, pos: block.pos,
      bodyFrom: block.pos + block.size, end, level, text: block.text, parentId: stack.at(-1)?.id || null };
    headings.push(entry); stack.push(entry);
  }
  return headings;
}
export function hiddenByHeading(pos: number, sections: HeadingSection[], folded: ReadonlySet<string>): boolean {
  return sections.some(section => folded.has(section.id) && pos >= section.bodyFrom && pos < section.end);
}
export function revealHeadings(pos: number, sections: HeadingSection[], folded: ReadonlySet<string>): Set<string> {
  return new Set([...folded].filter(id => !sections.some(s => s.id === id && pos >= s.bodyFrom && pos < s.end)));
}
export function activeHeading(pos: number, sections: HeadingSection[]): string | null {
  let active: string | null = null;
  for (const section of sections) { if (section.pos > pos) break; active = section.id; }
  return active;
}
export function foldedSpanEnd(pos: number, size: number, sections: HeadingSection[], folded: ReadonlySet<string>): number {
  const section = sections.find(s => s.pos === pos && folded.has(s.id));
  return section?.end ?? pos + size;
}
