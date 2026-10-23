export type TemplateNode = { type: string; attrs?: Record<string, unknown>; text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[]; content?: TemplateNode[] };
export type BlockTemplate = { id: string; name: string; content: TemplateNode[]; createdAt: string; uses: number };
export const TEMPLATE_KEY = 'docs-editor-lab-block-templates-v1';
export const TEMPLATE_LIMIT = 60, TEMPLATE_BYTES = 1000000;
/** Copies must not point to the original document's identities or comment threads. */
export function cleanTemplate(node: TemplateNode, depth = 0): TemplateNode {
  if (!node || typeof node !== 'object' || depth > 60 || typeof node.type !== 'string') throw new Error('Invalid template content.');
  const result: TemplateNode = { type: node.type };
  if (node.attrs) { result.attrs = { ...node.attrs }; delete result.attrs.blockId; delete result.attrs.commentId; }
  if (typeof node.text === 'string') result.text = node.text;
  if (node.marks) {
    if (!Array.isArray(node.marks)) throw new Error('Invalid template marks.');
    result.marks = node.marks.filter(mark => mark && typeof mark.type === 'string' && mark.type !== 'comment').map(mark => ({ ...mark }));
  }
  if (node.content) {
    if (!Array.isArray(node.content)) throw new Error('Invalid template children.');
    result.content = node.content.map(child => cleanTemplate(child, depth + 1));
  }
  return result;
}
export function templateName(name: string): string { return name.trim().replace(/\s+/g, ' ').slice(0, 80); }
export function templateExcerpt(nodes: TemplateNode[]): string {
  const output: string[] = [];
  const visit = (node: TemplateNode, depth: number) => {
    if (depth > 60 || output.join('').length > 200) return;
    if (node.text) output.push(node.text);
    if (node.type === 'image') output.push('[Image]');
    node.content?.forEach(child => visit(child, depth + 1));
    if (['paragraph', 'heading', 'codeBlock'].includes(node.type)) output.push('\n');
  };
  nodes.forEach(node => visit(node, 0)); return output.join('').trim().slice(0, 200);
}
export function decodeTemplates(raw: string | null): BlockTemplate[] {
  if (!raw) return [];
  if (new TextEncoder().encode(raw).length > TEMPLATE_BYTES) throw new Error('The template library exceeds its local limit.');
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.length > TEMPLATE_LIMIT) throw new Error('The template library is invalid.');
  const seen = new Set<string>();
  return value.map(item => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || seen.has(item.id) || typeof item.name !== 'string' ||
      !Array.isArray(item.content) || !item.content.length || item.content.length > 500) throw new Error('A block template is invalid.');
    seen.add(item.id);
    return { id: item.id, name: templateName(item.name), content: item.content.map((node: TemplateNode) => cleanTemplate(node)),
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
      uses: typeof item.uses === 'number' && Number.isFinite(item.uses) ? Math.max(0, Math.trunc(item.uses)) : 0 };
  });
}
export function encodeTemplates(templates: BlockTemplate[]): string {
  const raw = JSON.stringify(templates);
  decodeTemplates(raw); return raw;
}
