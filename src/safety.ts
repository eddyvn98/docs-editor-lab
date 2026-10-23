/** URLs accepted by document imports, paste, previews and popovers. */
export function safeLink(value: string): string | null {
  const url = value.trim();
  if (!url || /[\u0000-\u0020\u007f]/.test(url)) return null;
  if (/^#block-[a-zA-Z0-9_-]+$/.test(url)) return url;
  try {
    const parsed = new URL(url);
    return ["https:", "http:", "mailto:", "tel:"].includes(parsed.protocol) ? url : null;
  } catch { return null; }
}
export function safeImage(value: string): string | null {
  const url = value.trim();
  if (/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(url)) {
    return url.length <= 2_100_000 ? url : null;
  }
  if (url.startsWith("/") && !url.startsWith("//") && !/[\\\u0000-\u0020]/.test(url)) return url;
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol) && !/[\u0000-\u0020]/.test(url) ? url : null;
  } catch { return null; }
}
export function clampImageWidth(value: unknown): string {
  const n = Number.parseFloat(String(value));
  return `${Number.isFinite(n) ? Math.max(25, Math.min(100, n)) : 100}%`;
}
export function escapeHTML(value: string): string {
  return value.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
}
