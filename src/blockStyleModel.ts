export const calloutIcons = ['\u{1f4a1}', '\u{1f4cc}', '\u26a0\ufe0f', '\u2705', '\u{1f4dd}', '\u{1f3af}', '\u{1f4ac}', '\u{1f680}'];
export const blockColors = ['', '#eaf1ff', '#e7f5ea', '#fff3cf', '#fce5e8', '#f1e8fa', '#eef0f3'];
export function hexColor(value: unknown): string | null {
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value.toLowerCase() : null;
}
export function calloutIcon(value: unknown): string {
  return typeof value === 'string' && calloutIcons.includes(value) ? value : calloutIcons[0];
}
export function blockIndent(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(8, Math.max(0, Math.trunc(value))) : 0;
}
export function blockCSS(attrs: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  const background = hexColor(attrs.blockBackground), text = hexColor(attrs.blockTextColor), border = hexColor(attrs.calloutBorder);
  if (background) result.backgroundColor = background;
  if (text) result.color = text;
  if (border) result.borderColor = border;
  const indent = blockIndent(attrs.blockIndent);
  if (indent) result.marginInlineStart = `min(${indent * 1.5}em, 35%)`;
  return result;
}
