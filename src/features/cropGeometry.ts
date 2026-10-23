export type Crop = { x: number; y: number; width: number; height: number };
const finite = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback;
export const MIN_CROP = 0.1;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const FULL_CROP: Crop = { x: 0, y: 0, width: 100, height: 100 };
export function normalizeCrop(crop: Crop): Crop {
  const width = clamp(finite(crop.width, 100), MIN_CROP, 100);
  const height = clamp(finite(crop.height, 100), MIN_CROP, 100);
  return { width, height, x: clamp(finite(crop.x, 0), 0, 100 - width),
    y: clamp(finite(crop.y, 0), 0, 100 - height) };
}
export function aspectCrop(imageWidth: number, imageHeight: number, ratio: number): Crop {
  if (!(imageWidth > 0 && imageHeight > 0 && ratio > 0) || ![imageWidth, imageHeight, ratio].every(Number.isFinite)) return { ...FULL_CROP };
  const imageRatio = imageWidth / imageHeight;
  const width = imageRatio > ratio ? ratio / imageRatio * 100 : 100;
  const height = imageRatio > ratio ? 100 : imageRatio / ratio * 100;
  return normalizeCrop({ x: (100 - width) / 2, y: (100 - height) / 2, width, height });
}
export function pixelCrop(crop: Crop, width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) throw new Error("Image dimensions are unavailable.");
  const c = normalizeCrop(crop);
  const x = Math.floor(c.x * width / 100), y = Math.floor(c.y * height / 100);
  return { x, y, width: Math.max(1, Math.min(width - x, Math.round(c.width * width / 100))),
    height: Math.max(1, Math.min(height - y, Math.round(c.height * height / 100))) };
}
