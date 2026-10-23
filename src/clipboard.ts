import { safeImage } from "./safety";
export async function copyText(text: string): Promise<void> {
  if (!text) throw new Error("There is nothing to copy.");
  if (!navigator.clipboard?.writeText) throw new Error("Clipboard access requires HTTPS or localhost.");
  try { await navigator.clipboard.writeText(text); }
  catch { throw new Error("Clipboard permission was denied. Select the content and copy manually."); }
}
export async function downloadImage(source: string): Promise<void> {
  const src = safeImage(source); if (!src) throw new Error("Unsafe image URL.");
  const controller = new AbortController(), timer = window.setTimeout(() => controller.abort(), 15000);
  try {
    const result = await fetch(src, { signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer" });
    if (!result.ok) throw new Error("Image download failed.");
    const blob = await result.blob();
    if (!blob.type.startsWith("image/") || blob.size > 20_000_000) throw new Error("Invalid or oversized image.");
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "document-image"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch { throw new Error("This host blocks downloading the image. Open its URL and save it manually."); }
  finally { clearTimeout(timer); }
}
