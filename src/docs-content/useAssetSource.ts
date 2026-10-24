import { useEffect, useState } from 'react';
import { readAsset, safeMediaURL } from './assets';
export function useAssetSource(id: string, source: string, kind: string) {
  const [asset, setAsset] = useState<{ id: string; url: string; error: string }>({ id: '', url: '', error: '' });
  useEffect(() => {
    if (!id) return;
    let alive = true, url = '';
    setAsset({ id, url: '', error: '' });
    void readAsset(id).then(value => {
      if (!alive) return;
      // Attachments are download-only, including HTML/SVG uploaded as ordinary files.
      const blob = kind === 'file' ? new Blob([value.blob], { type: 'application/octet-stream' }) : value.blob;
      url = URL.createObjectURL(blob); setAsset({ id, url, error: '' });
    }).catch(error => { if (alive) setAsset({ id, url: '', error: String(error.message || error) }); });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [id, kind]);
  return id ? { url: asset.id === id ? asset.url : '', error: asset.id === id ? asset.error : '' } : { url: safeMediaURL(source, kind) || '', error: '' };
}
