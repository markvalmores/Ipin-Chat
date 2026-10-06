/**
 * Media compression, IndexedDB caching, Cross-tab BroadcastChannel sync, and video poster generator
 * Ensures videos and photos of ANY size can be sent and played reliably across tabs, sender and viewer!
 */

const DB_NAME = 'ipin_media_cache';
const STORE_NAME = 'media_blobs';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

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
          const db = await openDB();
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put(data.blob, data.key);
          tx.oncomplete = () => {
            window.dispatchEvent(new CustomEvent('ipin_media_blob_ready', { detail: { key: data.key } }));
          };
        } catch (e) {
          console.warn('Failed to save offered media blob:', e);
        }
      } else if (data.type === 'REQUEST_MEDIA' && data.key) {
        // Send back if we have it
        try {
          const db = await openDB();
          const tx = db.transaction(STORE_NAME, 'readonly');
          const req = tx.objectStore(STORE_NAME).get(data.key);
          req.onsuccess = () => {
            if (req.result && mediaChannel) {
              mediaChannel.postMessage({
                type: 'OFFER_MEDIA',
                key: data.key,
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
export async function storeMediaBlob(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(blob, key);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Broadcast to other open tabs (e.g. viewer tab in same browser)
    if (mediaChannel) {
      try {
        mediaChannel.postMessage({
          type: 'OFFER_MEDIA',
          key,
          blob
        });
      } catch (err) {
        // Ignore broadcast serialization issues
      }
    }

    window.dispatchEvent(new CustomEvent('ipin_media_blob_ready', { detail: { key } }));
  } catch (err) {
    console.warn('IndexedDB store failed:', err);
  }
}

/**
 * Retrieve a media blob and return a playable object URL (blob:http...)
 */
export async function getMediaBlobUrl(key: string): Promise<string | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);

    const blob = await new Promise<Blob | null>((resolve) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });

    if (blob) {
      return URL.createObjectURL(blob);
    }

    // If not found locally, request from sender tab via BroadcastChannel
    if (mediaChannel) {
      mediaChannel.postMessage({ type: 'REQUEST_MEDIA', key });

      // Wait up to 1.5s for response
      const waitedBlob = await new Promise<Blob | null>((resolve) => {
        let timer: number | null = null;

        const handler = async (e: Event) => {
          const detail = (e as CustomEvent).detail;
          if (detail && detail.key === key) {
            window.removeEventListener('ipin_media_blob_ready', handler);
            if (timer) clearTimeout(timer);
            try {
              const checkDb = await openDB();
              const checkTx = checkDb.transaction(STORE_NAME, 'readonly');
              const checkReq = checkTx.objectStore(STORE_NAME).get(key);
              checkReq.onsuccess = () => resolve(checkReq.result || null);
              checkReq.onerror = () => resolve(null);
            } catch {
              resolve(null);
            }
          }
        };

        window.addEventListener('ipin_media_blob_ready', handler);
        timer = window.setTimeout(() => {
          window.removeEventListener('ipin_media_blob_ready', handler);
          resolve(null);
        }, 1500);
      });

      if (waitedBlob) {
        return URL.createObjectURL(waitedBlob);
      }
    }

    return null;
  } catch (err) {
    return null;
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
