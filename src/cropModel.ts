export type Crop = { x: number; y: number; width: number; height: number };
export const fullCrop: Crop = { x: 0, y: 0, width: 100, height: 100 };
const number = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const round = (value: number) => Math.round(value * 100) / 100;
/** Percent coordinates always fit within the original image. No pixels are discarded. */
export function normalizeCrop(value: unknown): Crop {
  const a = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const width = round(Math.min(100, Math.max(10, number(a.width, 100))));
  const height = round(Math.min(100, Math.max(10, number(a.height, 100))));
  return { width, height, x: round(Math.min(100 - width, Math.max(0, number(a.x, 0)))),
    y: round(Math.min(100 - height, Math.max(0, number(a.y, 0)))) };
}
export const isCropped = (crop: Crop) => crop.x !== 0 || crop.y !== 0 || crop.width !== 100 || crop.height !== 100;
export function cropInsets(crop: Crop): string {
  return `${crop.y}% ${round(100 - crop.x - crop.width)}% ${round(100 - crop.y - crop.height)}% ${crop.x}%`;
}
export function imageCropStyle(crop: Crop, originalRatio: number): Record<string, string> {
  const ratio = Number.isFinite(originalRatio) && originalRatio > 0 ? originalRatio : 1;
  return { aspectRatio: String(ratio * crop.width / crop.height), overflow: 'hidden', position: 'relative' };
}
export function croppedImageStyle(crop: Crop): Record<string, string> {
  return { position: 'absolute', width: `${10000 / crop.width}%`, maxWidth: 'none', height: 'auto', maxHeight: 'none',
    left: `${-100 * crop.x / crop.width}%`, top: `${-100 * crop.y / crop.height}%`, borderRadius: '0' };
}
export function dragCrop(crop: Crop, dx: number, dy: number, mode: 'move' | 'resize'): Crop {
  return normalizeCrop(mode === 'move' ? { ...crop, x: crop.x + dx, y: crop.y + dy }
    : { ...crop, width: Math.min(100 - crop.x, crop.width + dx), height: Math.min(100 - crop.y, crop.height + dy) });
}
