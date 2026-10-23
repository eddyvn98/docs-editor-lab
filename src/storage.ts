export const DOCUMENT_KEY = "docs-editor-lab-v1";
export const COMMENTS_KEY = "docs-editor-lab-comments-v1";
export const TITLE_KEY = "docs-editor-lab-title-v1";
export const RECOVERY_KEY = "docs-editor-lab-recovery-v1";
export type StoreResult = { ok: true } | { ok: false; error: string };
export function writeStorage(key: string, value: unknown): StoreResult {
  try { localStorage.setItem(key, JSON.stringify(value)); return { ok: true }; }
  catch { return { ok: false, error: "Not saved: browser storage is full or blocked. Export JSON before closing." }; }
}
export function readStorage<T>(key: string, fallback: T, valid: (value: unknown) => value is T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return valid(parsed) ? parsed : fallback;
  } catch { return fallback; }
}
export function downloadText(name: string, content: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
