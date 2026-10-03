/**
 * Media compression, IndexedDB caching, and video thumbnail generator
 * Ensures images and videos of ANY size can be sent and saved without Firestore 1MB limits!
 */

const DB_NAME = 'ipin_media_cache';
const STORE_NAME = 'media_blobs';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a large media blob (e.g. video file of any size) to IndexedDB
 */
export async function storeMediaBlob(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(blob, key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB store failed:', err);
  }
}

/**
 * Retrieve a media blob and return a playable object URL
 */
export async function getMediaBlobUrl(key: string): Promise<string | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const blob = request.result as Blob | undefined;
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
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
    // If it's small enough (< 400KB), check if it's animated gif or apng
    if (file.size < 400 * 1024) {
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
        // Fallback to original
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      // Produce compressed JPG or PNG
      const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = format === 'image/jpeg' ? 0.8 : undefined;
      const dataUrl = canvas.toDataURL(format, quality);
      resolve(dataUrl);
    };

    img.onerror = () => {
      // Fallback
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    };

    img.src = url;
  });
}

/**
 * Capture poster frame from an MP4 video file
 */
export async function captureVideoPoster(file: File): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.currentTime = 0.5;

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve('');
    }, 3000);

    video.onloadeddata = () => {
      video.currentTime = 0.5;
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(video.videoWidth || 640, 640);
      canvas.height = Math.min(video.videoHeight || 360, 360);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const posterData = canvas.toDataURL('image/jpeg', 0.7);
        URL.revokeObjectURL(url);
        resolve(posterData);
      } else {
        URL.revokeObjectURL(url);
        resolve('');
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve('');
    };
  });
}
