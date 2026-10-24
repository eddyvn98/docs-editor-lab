export function columnWidths(value: unknown, count: number): number[] {
  const input = Array.isArray(value) ? value : [];
  const widths = Array.from({ length: count }, (_, i) => Number.isFinite(Number(input[i])) && Number(input[i]) > 0 ? Math.max(3, Math.min(97, Number(input[i]))) : 100 / count);
  const total = widths.reduce((sum, width) => sum + width, 0);
  return widths.map(width => Math.round(width / total * 10000) / 100);
}
export function readWidths(value: string | null): number[] | null {
  try { const parsed: unknown = JSON.parse(value || 'null'); return Array.isArray(parsed) && parsed.length <= 6 ? parsed.map(Number) : null; }
  catch { return null; }
}
export const columnTracks = (widths: number[]) => widths.map(width => `minmax(0, ${width}fr)`).join(' ');
