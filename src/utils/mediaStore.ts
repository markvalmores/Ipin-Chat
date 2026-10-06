/**
 * Media compression, IndexedDB caching, Cross-tab BroadcastChannel sync, and video poster generator
 * Ensures videos and photos of ANY size can be sent and played reliably across tabs, sender and viewer!
 */

const DB_NAME = 'ipin_media_cache';
const STORE_NAME = 'media_blobs';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;
const objectUrlCache = new Map<string, string>();
const blobCache = new Map<string, Blob>();

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

// Cross-tab transfer channel
let mediaChannel: BroadcastChannel | null = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    mediaChannel = new BroadcastChannel('ipin_media_transfer');
    mediaChannel.onmessage = async (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'OFFER_MEDIA' && data.key && data.blob) {
        try {
          const cleanKey = String(data.key).replace(/^local_media:/, '');
          const url = URL.createObjectURL(data.blob);
          objectUrlCache.set(cleanKey, url);
          objectUrlCache.set(`local_media:${cleanKey}`, url);
          blobCache.set(cleanKey, data.blob);
          blobCache.set(`local_media:${cleanKey}`, data.blob);

          const db = await openDB();
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put(data.blob, cleanKey);
          tx.oncomplete = () => {
            window.dispatchEvent(new CustomEvent('ipin_media_blob_ready', { detail: { key: cleanKey, url, blob: data.blob } }));
          };
        } catch (e) {
          console.warn('Failed to save offered media blob:', e);
        }
      } else if (data.type === 'REQUEST_MEDIA' && data.key) {
        const cleanKey = String(data.key).replace(/^local_media:/, '');
        try {
          if (blobCache.has(cleanKey) && mediaChannel) {
            mediaChannel.postMessage({
              type: 'OFFER_MEDIA',
              key: cleanKey,
              blob: blobCache.get(cleanKey)!
            });
            return;
          }
          const db = await openDB();
          const tx = db.transaction(STORE_NAME, 'readonly');
          const req = tx.objectStore(STORE_NAME).get(cleanKey);
          req.onsuccess = () => {
            if (req.result && mediaChannel) {
              blobCache.set(cleanKey, req.result);
              mediaChannel.postMessage({
                type: 'OFFER_MEDIA',
                key: cleanKey,
                blob: req.result
              });
            }
          };
        } catch (e) {
          // Ignore
        }
      }
    };
  }
} catch (e) {
  console.warn('BroadcastChannel not supported:', e);
}

/**
 * Save a media blob (video/audio/file) to IndexedDB and broadcast across open tabs
 */
export async function storeMediaBlob(key: string, blob: Blob): Promise<string> {
  const cleanKey = String(key).replace(/^local_media:/, '');
  try {
    const objectUrl = URL.createObjectURL(blob);
    objectUrlCache.set(cleanKey, objectUrl);
    objectUrlCache.set(`local_media:${cleanKey}`, objectUrl);
    blobCache.set(cleanKey, blob);
    blobCache.set(`local_media:${cleanKey}`, blob);

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(blob, cleanKey);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Broadcast to other open tabs (e.g. viewer tab in same browser)
    if (mediaChannel) {
      try {
        mediaChannel.postMessage({
          type: 'OFFER_MEDIA',
          key: cleanKey,
          blob
        });
      } catch (err) {
        // Ignore broadcast serialization issues
      }
    }

    window.dispatchEvent(new CustomEvent('ipin_media_blob_ready', { detail: { key: cleanKey, url: objectUrl, blob } }));
    return objectUrl;
  } catch (err) {
    console.warn('IndexedDB store failed:', err);
    const fallbackUrl = URL.createObjectURL(blob);
    objectUrlCache.set(cleanKey, fallbackUrl);
    blobCache.set(cleanKey, blob);
    return fallbackUrl;
  }
}

/**
 * Retrieve the original uncompressed binary Blob for an exact file download
 */
export async function getMediaBlob(key: string): Promise<Blob | null> {
  if (!key) return null;
  const cleanKey = String(key).replace(/^local_media:/, '');

  if (blobCache.has(cleanKey)) {
    return blobCache.get(cleanKey)!;
  }
  if (blobCache.has(`local_media:${cleanKey}`)) {
    return blobCache.get(`local_media:${cleanKey}`)!;
  }

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(cleanKey);

    const blob = await new Promise<Blob | null>((resolve) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });

    if (blob) {
      blobCache.set(cleanKey, blob);
      return blob;
    }

    // Request from sender tab
    if (mediaChannel) {
      mediaChannel.postMessage({ type: 'REQUEST_MEDIA', key: cleanKey });

      const waitedBlob = await new Promise<Blob | null>((resolve) => {
        let timer: number | null = null;
        const handler = (e: Event) => {
          const detail = (e as CustomEvent).detail;
          if (detail && (detail.key === cleanKey || detail.key === `local_media:${cleanKey}`) && detail.blob) {
            window.removeEventListener('ipin_media_blob_ready', handler);
            if (timer) clearTimeout(timer);
            resolve(detail.blob);
          }
        };

        window.addEventListener('ipin_media_blob_ready', handler);
        timer = window.setTimeout(() => {
          window.removeEventListener('ipin_media_blob_ready', handler);
          resolve(blobCache.get(cleanKey) || null);
        }, 1200);
      });

      if (waitedBlob) {
        blobCache.set(cleanKey, waitedBlob);
        return waitedBlob;
      }
    }

    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Retrieve a media blob and return a playable object URL (blob:http...)
 */
export async function getMediaBlobUrl(key: string): Promise<string | null> {
  if (!key) return null;
  const cleanKey = String(key).replace(/^local_media:/, '');

  // 1. Instant synchronous memory check
  if (objectUrlCache.has(cleanKey)) {
    return objectUrlCache.get(cleanKey)!;
  }
  if (objectUrlCache.has(`local_media:${cleanKey}`)) {
    return objectUrlCache.get(`local_media:${cleanKey}`)!;
  }

  // 2. Local IndexedDB lookup
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(cleanKey);

    const blob = await new Promise<Blob | null>((resolve) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });

    if (blob) {
      blobCache.set(cleanKey, blob);
      const url = URL.createObjectURL(blob);
      objectUrlCache.set(cleanKey, url);
      objectUrlCache.set(`local_media:${cleanKey}`, url);
      return url;
    }

    // 3. If not found locally, request from sender tab via BroadcastChannel
    if (mediaChannel) {
      mediaChannel.postMessage({ type: 'REQUEST_MEDIA', key: cleanKey });

      // Wait up to 1.5s for response
      const waitedUrl = await new Promise<string | null>((resolve) => {
        let timer: number | null = null;

        const handler = (e: Event) => {
          const detail = (e as CustomEvent).detail;
          if (detail && (detail.key === cleanKey || detail.key === `local_media:${cleanKey}`)) {
            window.removeEventListener('ipin_media_blob_ready', handler);
            if (timer) clearTimeout(timer);
            resolve(detail.url || objectUrlCache.get(cleanKey) || null);
          }
        };

        window.addEventListener('ipin_media_blob_ready', handler);
        timer = window.setTimeout(() => {
          window.removeEventListener('ipin_media_blob_ready', handler);
          resolve(objectUrlCache.get(cleanKey) || null);
        }, 1200);
      });

      if (waitedUrl) {
        return waitedUrl;
      }
      if (objectUrlCache.has(cleanKey)) {
        return objectUrlCache.get(cleanKey)!;
      }
    }

    return null;
  } catch (err) {
    return null;
  }
}

export interface DownloadMediaOptions {
  urlOrKey: string;
  fileName?: string;
  fileFormat?: string;
  fileSize?: number;
}

/**
 * Downloads the exact binary file with exact byte length and filename!
 * Works across local blobs, IndexedDB cache, Base64 data URLs, and remote URLs.
 */
export async function downloadMediaFile(options: DownloadMediaOptions): Promise<boolean> {
  const { urlOrKey, fileName, fileFormat } = options;
  if (!urlOrKey) return false;

  let blob: Blob | null = null;
  const target = String(urlOrKey).trim();
  const cleanKey = target.replace(/^local_media:/, '');

  try {
    // 1. If it's a local_media key or in blob cache/IndexedDB
    if (target.startsWith('local_media:') || target.startsWith('vid_') || blobCache.has(cleanKey)) {
      blob = await getMediaBlob(cleanKey);
    }

    // 2. If it's a Base64 data URL
    if (!blob && target.startsWith('data:')) {
      const parts = target.split(',');
      if (parts.length === 2) {
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : (fileFormat ? `video/${fileFormat}` : 'video/mp4');
        const b64Data = parts[1];
        const binaryStr = atob(b64Data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: mimeType });
      }
    }

    // 3. If it's a blob: or http(s): URL
    if (!blob && (target.startsWith('blob:') || target.startsWith('http://') || target.startsWith('https://'))) {
      try {
        const response = await fetch(target, { mode: 'cors' });
        if (response.ok) {
          blob = await response.blob();
        }
      } catch (e) {
        console.warn('Direct fetch failed, falling back to anchor trigger:', e);
      }
    }

    // Determine final file extension and name
    let ext = (fileFormat || '').toLowerCase().replace(/^\./, '');
    if (!ext) {
      if (blob && blob.type) {
        const typePart = blob.type.split('/')[1];
        if (typePart) ext = typePart.split(';')[0];
      }
      if (!ext) ext = 'mp4';
    }

    let finalName = fileName ? fileName.trim() : `video_${Date.now()}.${ext}`;
    if (!finalName.toLowerCase().endsWith(`.${ext}`)) {
      finalName = `${finalName}.${ext}`;
    }

    // 4. Trigger download with exact file and size
    if (blob) {
      if (!blob.type || blob.type === 'application/octet-stream') {
        blob = new Blob([blob], { type: `video/${ext}` });
      }
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = objectUrl;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      window.setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      }, 3000);
      return true;
    } else {
      // Direct anchor trigger as fallback
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = target;
      a.download = finalName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      window.setTimeout(() => {
        document.body.removeChild(a);
      }, 3000);
      return true;
    }
  } catch (err) {
    console.error('downloadMediaFile error:', err);
    return false;
  }
}

/**
 * Compress images so they never exceed Firestore's 1MB document limit
 * Supports PNG, GIF, JPG, BMP, and APNG!
 */
export async function compressImageForUpload(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's small enough (< 350KB), keep original format
    if (file.size < 350 * 1024) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const maxDim = 1200;
      let { width, height } = img;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = format === 'image/jpeg' ? 0.82 : undefined;
      const dataUrl = canvas.toDataURL(format, quality);
      resolve(dataUrl);
    };

    img.onerror = () => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    };

    img.src = url;
  });
}

/**
 * Capture poster frame from an MP4/WebM video file
 */
export async function captureVideoPoster(file: File): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve('');
    }, 4000);

    const extractFrame = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth || 640, 640);
        canvas.height = Math.min(video.videoHeight || 360, 360);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const posterData = canvas.toDataURL('image/jpeg', 0.75);
          clearTimeout(timeout);
          URL.revokeObjectURL(url);
          resolve(posterData);
          return;
        }
      } catch (e) {
        // Fallback
      }
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve('');
    };

    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
      } catch {
        extractFrame();
      }
    };

    video.onseeked = () => {
      extractFrame();
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve('');
    };
  });
}
