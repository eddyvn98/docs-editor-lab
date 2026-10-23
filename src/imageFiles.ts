import type { Editor } from "@tiptap/react";
import type { Transaction } from "@tiptap/pm/state";
const allowed = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
export function imageToDataUrl(file: File): Promise<string> {
  if (!allowed.has(file.type)) return Promise.reject(new Error("Use a PNG, JPEG, WebP or GIF image."));
  if (file.size > 1_500_000) return Promise.reject(new Error("Image exceeds the 1.5 MB local limit."));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Invalid image data."));
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.onabort = () => reject(new Error("Image upload was cancelled."));
    reader.readAsDataURL(file);
  });
}
export async function insertImageFile(editor: Editor, file: File, position?: number) {
  // Insert at the original target, not wherever the caret moved during FileReader.
  let pos = position ?? editor.state.selection.to;
  let deleted = false;
  const map = ({ transaction }: { transaction: Transaction }) => {
    const result = transaction.mapping.mapResult(pos, 1); pos = result.pos; deleted ||= result.deleted;
  };
  editor.on("transaction", map);
  try {
    const src = await imageToDataUrl(file);
    if (editor.isDestroyed || deleted) throw new Error("The image insertion point was removed.");
    if (!editor.commands.insertContentAt(pos, { type: "image", attrs: { src, alt: file.name, width: "80%", caption: file.name } })) {
      throw new Error("An image cannot be inserted at this position.");
    }
  } finally { editor.off("transaction", map); }
}
