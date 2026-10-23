export type ViewPreferences = {
  mode: 'edit' | 'read'; width: 'page' | 'wide'; font: 'sans' | 'serif' | 'mono';
  size: number; focus: boolean; theme: 'light' | 'dark';
};
export const defaultView: ViewPreferences = { mode: 'edit', width: 'page', font: 'sans', size: 16, focus: false, theme: 'light' };
export function parseView(value: unknown): ViewPreferences {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return { mode: item.mode === 'read' ? 'read' : 'edit', width: item.width === 'wide' ? 'wide' : 'page',
    font: item.font === 'serif' || item.font === 'mono' ? item.font : 'sans',
    size: typeof item.size === 'number' && Number.isFinite(item.size) ? Math.min(22, Math.max(14, Math.round(item.size))) : 16,
    focus: item.focus === true, theme: item.theme === 'dark' ? 'dark' : 'light' };
}
