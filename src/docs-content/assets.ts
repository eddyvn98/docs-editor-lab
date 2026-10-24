/** Binary attachments stay in IndexedDB, never in ephemeral object URLs in saved JSON. */
export type Asset = { id: string; blob: Blob; name: string; type: string; size: number };
const DATABASE = 'docs-editor-assets-v1', STORE = 'assets';
let connection: Promise<IDBDatabase> | undefined;
function database(): Promise<IDBDatabase> {
  if (!connection) connection = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('Attachment storage is unavailable in this browser.')); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' }); };
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); connection = undefined; }; resolve(db); };
    request.onerror = () => { connection = undefined; reject(new Error('Attachment storage could not be opened.')); };
    request.onblocked = () => { connection = undefined; reject(new Error('Close older document tabs and try the upload again.')); };
  });
  return connection;
}
export const validAssetId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
export async function saveAsset(file: File | Blob, name = file instanceof File ? file.name : 'Attachment'): Promise<Asset> {
  if (file.size > 100_000_000) throw new Error('The maximum attachment size is 100 MB.');
  const db = await database(), asset: Asset = { id: crypto.randomUUID(), blob: file, name: name.slice(0, 200), type: file.type, size: file.size };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(asset);
    tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => reject(new Error('The attachment could not be saved. Browser storage may be full.'));
  });
  return asset;
}
export async function readAsset(id: string): Promise<Asset> {
  if (!validAssetId(id)) throw new Error('Invalid attachment reference.');
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
    request.onsuccess = () => { const asset = request.result as Asset | undefined; asset?.blob instanceof Blob ? resolve(asset) : reject(new Error('This attachment is not stored in this browser. Import a portable document copy or upload it again.')); };
    request.onerror = () => reject(new Error('The attachment could not be read.'));
  });
}
export function blobDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('The attachment could not be encoded.')); reader.readAsDataURL(blob); });
}
export function safeMediaURL(value: unknown, kind: string): string | null {
  const source = typeof value === 'string' ? value.trim() : '';
  if (!source || /[\u0000-\u0020\\]/.test(source)) return null;
  if (kind !== 'web' && source.length <= 140_000_000 && /^data:(audio\/[a-z0-9.+-]+|video\/[a-z0-9.+-]+|application\/octet-stream);base64,[a-z0-9+/=]+$/i.test(source)) return source;
  try { const url = new URL(source); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? source : null; } catch { return null; }
}
