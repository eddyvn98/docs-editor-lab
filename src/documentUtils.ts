export type Match = { from: number; to: number };
export type SearchDoc = {
  descendants: (fn: (node: { isText?: boolean; text?: string | null }, pos: number) => void) => void;
};
/** Join adjacent text nodes so marks do not break searches. Never span blocks. */
export function findMatches(doc: SearchDoc, query: string): Match[] {
  if (!query.trim()) return [];
  const runs: { text: string; from: number; to: number }[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const previous = runs.at(-1);
    if (previous?.to === pos) { previous.text += node.text; previous.to += node.text.length; }
    else runs.push({ text: node.text, from: pos, to: pos + node.text.length });
  });
  // Literal, case-insensitive search without lowercasing (which can change UTF-16 length).
  const expression = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu");
  return runs.flatMap(run => Array.from(run.text.matchAll(expression), hit => ({
    from: run.from + hit.index!, to: run.from + hit.index! + hit[0].length,
  })));
}
export function isDocument(value: unknown): value is { type: "doc"; content?: unknown[] } {
  if (!value || typeof value !== "object") return false;
  const doc = value as Record<string, unknown>;
  return doc.type === "doc" && (doc.content === undefined || Array.isArray(doc.content));
}
export function safeFileName(name: string): string {
  return name.replace(/[^\p{L}\p{N} _.-]/gu, "").trim().replace(/\s+/g, "-").slice(0, 70) || "document";
}
