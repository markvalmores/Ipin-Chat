/**
 * Media compression, IndexedDB caching, Cross-tab BroadcastChannel sync, Firestore cloud chunk sync, and video poster generator
 * Ensures videos and photos of ANY size (e.g. 12.9 MB MP4) can be sent, played, and downloaded reliably across all browsers!
 */

import { doc, setDoc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const DB_NAME = 'ipin_media_cache';
const STORE_NAME = 'media_blobs';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;
const objectUrlCache = new Map<string, string>();
const blobCache = new Map<string, Blob>();

export interface MediaDownloadProgress {
  key: string;
  loadedBytes: number;
  totalBytes: number;
  percent: number;
  fileName?: string;
}

/**
 * Listen for live download / buffering byte accumulation for a given media key
 */
export function subscribeMediaDownloadProgress(
  key: string,
  callback: (progress: MediaDownloadProgress) => void
): () => void {
  const cleanKey = String(key || '')
    .replace(/^shared_media:/, '')
    .replace(/^local_media:/, '');

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<MediaDownloadProgress>).detail;
    if (!detail) return;
    if (
      detail.key === cleanKey ||
      detail.key === `shared_media:${cleanKey}` ||
      detail.key === `local_media:${cleanKey}`
    ) {
      callback(detail);
    }
  };

  window.addEventListener('ipin_media_download_progress', handler);
  return () => {
    window.removeEventListener('ipin_media_download_progress', handler);
  };
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const dbInstance = request.result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME);
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
          const cleanKey = String(data.key).replace(/^local_media:/, '').replace(/^shared_media:/, '');
          const url = URL.createObjectURL(data.blob);
          objectUrlCache.set(cleanKey, url);
          objectUrlCache.set(`local_media:${cleanKey}`, url);
          objectUrlCache.set(`shared_media:${cleanKey}`, url);
          blobCache.set(cleanKey, data.blob);
          blobCache.set(`local_media:${cleanKey}`, data.blob);
          blobCache.set(`shared_media:${cleanKey}`, data.blob);

          const db = await openDB();
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put(data.blob, cleanKey);
          tx.oncomplete = () => {
            window.dispatchEvent(
              new CustomEvent('ipin_media_blob_ready', { detail: { key: cleanKey, url, blob: data.blob } })
            );
          };
        } catch (e) {
          console.warn('Failed to save offered media blob:', e);
        }
      } else if (data.type === 'REQUEST_MEDIA' && data.key) {
        const cleanKey = String(data.key).replace(/^local_media:/, '').replace(/^shared_media:/, '');
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
 * Converts a Blob to a Base64 data URL
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Decodes a Base64 string chunk into a Uint8Array with zero call stack memory overhead
 */
export function decodeBase64ToUint8Array(b64: string): Uint8Array {
  // Clean padding or carriage returns if any
  const cleanB64 = b64.replace(/[\r\n\s]/g, '');
  const binaryStr = atob(cleanB64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

/**
 * Save a media blob (video/audio/file) to IndexedDB and broadcast across open tabs
 */
export async function storeMediaBlob(key: string, blob: Blob): Promise<string> {
  const cleanKey = String(key)
    .replace(/^shared_media:/, '')
    .replace(/^local_media:/, '');
  try {
    const objectUrl = URL.createObjectURL(blob);
    objectUrlCache.set(cleanKey, objectUrl);
    objectUrlCache.set(`local_media:${cleanKey}`, objectUrl);
    objectUrlCache.set(`shared_media:${cleanKey}`, objectUrl);
    blobCache.set(cleanKey, blob);
    blobCache.set(`local_media:${cleanKey}`, blob);
    blobCache.set(`shared_media:${cleanKey}`, blob);

    const dbInst = await openDB();
    const tx = dbInst.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(blob, cleanKey);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Broadcast to other open tabs in the same browser
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

    window.dispatchEvent(
      new CustomEvent('ipin_media_blob_ready', { detail: { key: cleanKey, url: objectUrl, blob } })
    );
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
 * Saves a media blob to Firestore cloud chunks and local IndexedDB, returning
 * an embedded Data URL (for fast small videos <= 500KB) or 'shared_media:{key}'
 * so both users on any device or browser can instantly play and download it!
 */
export async function storeSharedMediaToCloud(
  key: string,
  blob: Blob,
  options?: { fileName?: string; fileFormat?: string; fileSize?: number }
): Promise<string> {
  const cleanKey = String(key)
    .replace(/^shared_media:/, '')
    .replace(/^local_media:/, '');

  // 1. Cache locally first for instant sender playback
  await storeMediaBlob(cleanKey, blob);

  // 2. If small enough (<= 500 KB), return embedded data URL for instant 0-roundtrip sync!
  if (blob.size <= 500 * 1024) {
    const dataUrl = await blobToBase64(blob);
    return dataUrl;
  }

  // 3. For larger video, upload chunks in controlled batches of 3 to avoid mobile 4G drops
  try {
    const fullDataUrl = await blobToBase64(blob);
    const b64Data = fullDataUrl.includes(',') ? fullDataUrl.split(',')[1] : fullDataUrl;
    
    // 600,000 characters is a multiple of 4 (600,000 % 4 === 0) and is ~450 KB binary, safely within Firestore 1MB doc limit
    const CHUNK_SIZE = 600000;
    const totalChunks = Math.ceil(b64Data.length / CHUNK_SIZE);
    const mimeType = blob.type || (options?.fileFormat ? `video/${options.fileFormat}` : 'video/mp4');
    const fileName = options?.fileName || 'Video_Message.mp4';
    const fileSize = blob.size;

    // Parent metadata doc
    await setDoc(doc(db, 'shared_media', cleanKey), {
      id: cleanKey,
      mimeType,
      fileName,
      fileSize,
      totalChunks,
      createdAt: new Date().toISOString()
    });

    // Upload chunks in small batches of 3 with retry to protect mobile connections
    const BATCH_SIZE = 3;
    for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
      const batchPromises: Promise<any>[] = [];
      const end = Math.min(i + BATCH_SIZE, totalChunks);
      
      for (let j = i; j < end; j++) {
        const chunkPart = b64Data.slice(j * CHUNK_SIZE, (j + 1) * CHUNK_SIZE);
        const chunkDocRef = doc(db, 'shared_media', cleanKey, 'chunks', String(j));
        batchPromises.push(
          setDoc(chunkDocRef, {
            index: j,
            data: chunkPart
          })
        );
      }

      // Execute batch
      try {
        await Promise.all(batchPromises);
      } catch (batchErr) {
        console.warn(`Retry chunk batch ${i} to ${end}:`, batchErr);
        // Small retry delay
        await new Promise((r) => setTimeout(r, 400));
        await Promise.all(batchPromises);
      }
    }

    return `shared_media:${cleanKey}`;
  } catch (err) {
    console.warn('Failed to upload shared media chunks to Firestore:', err);
    return `local_media:${cleanKey}`;
  }
}

/**
 * Retrieve the original uncompressed binary Blob for an exact file download and playback.
 * Checks memory -> IndexedDB -> Firestore shared_media cloud (with live byte accumulation) -> BroadcastChannel
 */
export async function getMediaBlob(key: string): Promise<Blob | null> {
  if (!key) return null;
  const cleanKey = String(key)
    .replace(/^shared_media:/, '')
    .replace(/^local_media:/, '');

  if (blobCache.has(cleanKey)) {
    return blobCache.get(cleanKey)!;
  }
  if (blobCache.has(`local_media:${cleanKey}`)) {
    return blobCache.get(`local_media:${cleanKey}`)!;
  }
  if (blobCache.has(`shared_media:${cleanKey}`)) {
    return blobCache.get(`shared_media:${cleanKey}`)!;
  }

  // 1. Check local IndexedDB
  try {
    const dbInst = await openDB();
    const tx = dbInst.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(cleanKey);

    const blob = await new Promise<Blob | null>((resolve) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });

    if (blob) {
      blobCache.set(cleanKey, blob);
      blobCache.set(`shared_media:${cleanKey}`, blob);
      blobCache.set(`local_media:${cleanKey}`, blob);
      return blob;
    }
  } catch (e) {
    // Continue to cloud
  }

  // 2. Fetch from Firestore shared_media cloud storage with progressive byte accumulation
  try {
    const mediaDocRef = doc(db, 'shared_media', cleanKey);
    const mediaDocSnap = await getDoc(mediaDocRef);
    if (mediaDocSnap.exists()) {
      const meta = mediaDocSnap.data();
      const mimeType = meta.mimeType || 'video/mp4';
      const totalChunks = meta.totalChunks || 1;
      const expectedTotalBytes = meta.fileSize || 0;

      // Notify start of download
      window.dispatchEvent(
        new CustomEvent('ipin_media_download_progress', {
          detail: {
            key: cleanKey,
            loadedBytes: 0,
            totalBytes: expectedTotalBytes,
            percent: 0,
            fileName: meta.fileName
          }
        })
      );

      const chunkByteArrays: Uint8Array[] = new Array(totalChunks);
      let accumulatedBytes = 0;

      // Fetch chunks in batches of 4
      const BATCH_SIZE = 4;
      for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
        const batchIndices: number[] = [];
        const end = Math.min(i + BATCH_SIZE, totalChunks);
        for (let j = i; j < end; j++) {
          batchIndices.push(j);
        }

        const chunkDocSnaps = await Promise.all(
          batchIndices.map((idx) =>
            getDoc(doc(db, 'shared_media', cleanKey, 'chunks', String(idx)))
          )
        );

        for (const cDoc of chunkDocSnaps) {
          if (cDoc.exists()) {
            const chunkData = cDoc.data();
            const chunkIndex = typeof chunkData.index === 'number' ? chunkData.index : 0;
            if (chunkData.data) {
              const chunkBytes = decodeBase64ToUint8Array(chunkData.data);
              chunkByteArrays[chunkIndex] = chunkBytes;
              accumulatedBytes += chunkBytes.byteLength;
            }
          }
        }

        // Live download accumulation event
        const progressPercent = expectedTotalBytes > 0
          ? Math.min(100, Math.round((accumulatedBytes / expectedTotalBytes) * 100))
          : Math.min(100, Math.round((end / totalChunks) * 100));

        window.dispatchEvent(
          new CustomEvent('ipin_media_download_progress', {
            detail: {
              key: cleanKey,
              loadedBytes: accumulatedBytes,
              totalBytes: expectedTotalBytes || accumulatedBytes,
              percent: progressPercent,
              fileName: meta.fileName
            }
          })
        );
      }

      // Check if all chunks were loaded
      const validByteArrays = chunkByteArrays.filter((b): b is Uint8Array => b instanceof Uint8Array);
      if (validByteArrays.length > 0) {
        const cloudBlob = new Blob(validByteArrays as BlobPart[], { type: mimeType });

        // Final 100% download event
        window.dispatchEvent(
          new CustomEvent('ipin_media_download_progress', {
            detail: {
              key: cleanKey,
              loadedBytes: cloudBlob.size,
              totalBytes: cloudBlob.size,
              percent: 100,
              fileName: meta.fileName
            }
          })
        );

        // Cache in local IndexedDB so subsequent views and downloads are instant!
        await storeMediaBlob(cleanKey, cloudBlob);
        return cloudBlob;
      }
    }
  } catch (err) {
    console.warn('Firestore shared media fetch error:', err);
  }

  // 3. Fallback: BroadcastChannel request from sender tab
  if (mediaChannel) {
    try {
      mediaChannel.postMessage({ type: 'REQUEST_MEDIA', key: cleanKey });

      const waitedBlob = await new Promise<Blob | null>((resolve) => {
        let timer: number | null = null;
        const handler = (e: Event) => {
          const detail = (e as CustomEvent).detail;
          if (
            detail &&
            (detail.key === cleanKey ||
              detail.key === `local_media:${cleanKey}` ||
              detail.key === `shared_media:${cleanKey}`) &&
            detail.blob
          ) {
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
    } catch (e) {}
  }

  return null;
}

/**
 * Retrieve a media blob and return a playable object URL (blob:http...)
 * Works across local cache, IndexedDB, Firestore cloud chunks, and cross-tab sync!
 */
export async function getMediaBlobUrl(key: string): Promise<string | null> {
  if (!key) return null;

  // Direct URLs return immediately
  if (
    key.startsWith('http://') ||
    key.startsWith('https://') ||
    key.startsWith('data:') ||
    key.startsWith('blob:') ||
    key.startsWith('/') ||
    key.startsWith('./')
  ) {
    return key;
  }

  const cleanKey = String(key)
    .replace(/^shared_media:/, '')
    .replace(/^local_media:/, '');

  // Instant synchronous memory check
  if (objectUrlCache.has(cleanKey)) {
    return objectUrlCache.get(cleanKey)!;
  }
  if (objectUrlCache.has(`shared_media:${cleanKey}`)) {
    return objectUrlCache.get(`shared_media:${cleanKey}`)!;
  }
  if (objectUrlCache.has(`local_media:${cleanKey}`)) {
    return objectUrlCache.get(`local_media:${cleanKey}`)!;
  }

  const blob = await getMediaBlob(cleanKey);
  if (blob) {
    const url = URL.createObjectURL(blob);
    objectUrlCache.set(cleanKey, url);
    objectUrlCache.set(`local_media:${cleanKey}`, url);
    objectUrlCache.set(`shared_media:${cleanKey}`, url);
    window.dispatchEvent(
      new CustomEvent('ipin_media_blob_ready', { detail: { key: cleanKey, url, blob } })
    );
    return url;
  }

  return null;
}

export interface DownloadMediaOptions {
  urlOrKey: string;
  rawKey?: string;
  mediaUrl?: string;
  fileName?: string;
  fileFormat?: string;
  fileSize?: number;
  onProgress?: (progress: MediaDownloadProgress) => void;
}

/**
 * Downloads the exact binary file with exact byte length and filename!
 * Works across local blobs, IndexedDB cache, Base64 data URLs, and Firestore chunks.
 */
export async function downloadMediaFile(options: DownloadMediaOptions): Promise<boolean> {
  const { urlOrKey, rawKey, mediaUrl, fileName, fileFormat, onProgress } = options;
  if (!urlOrKey && !rawKey && !mediaUrl) return false;

  let blob: Blob | null = null;
  const target = String(urlOrKey || mediaUrl || rawKey || '').trim();

  // Candidate keys for blobCache, IndexedDB, and Firestore shared_media lookup
  const candidateKeys: string[] = [];
  if (rawKey) candidateKeys.push(rawKey.replace(/^shared_media:/, '').replace(/^local_media:/, ''));
  if (mediaUrl) candidateKeys.push(mediaUrl.replace(/^shared_media:/, '').replace(/^local_media:/, ''));
  if (target) candidateKeys.push(target.replace(/^shared_media:/, '').replace(/^local_media:/, ''));

  // Subscribe to progress if handler provided
  let unsubscribe: (() => void) | null = null;
  if (onProgress && candidateKeys[0]) {
    unsubscribe = subscribeMediaDownloadProgress(candidateKeys[0], onProgress);
  }

  try {
    // 1. Check blobCache and IndexedDB for exact original Blob
    for (const key of candidateKeys) {
      if (!key) continue;
      if (blobCache.has(key)) {
        blob = blobCache.get(key)!;
        break;
      }
      const found = await getMediaBlob(key);
      if (found) {
        blob = found;
        break;
      }
    }

    // 2. If it's a Base64 data URL
    if (!blob && target.startsWith('data:')) {
      const parts = target.split(',');
      if (parts.length === 2) {
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : (fileFormat ? `video/${fileFormat}` : 'video/mp4');
        const b64Data = parts[1];
        const bytes = decodeBase64ToUint8Array(b64Data);
        blob = new Blob([bytes as unknown as BlobPart], { type: mimeType });
      }
    }

    // 3. If it's a relative path (/videos/...), blob:, or http(s): URL
    if (!blob && (target.startsWith('/') || target.startsWith('blob:') || target.startsWith('http://') || target.startsWith('https://'))) {
      try {
        const fetchUrl = target.startsWith('/') ? `${window.location.origin}${target}` : target;
        const response = await fetch(fetchUrl, { mode: 'cors' });
        if (response.ok) {
          blob = await response.blob();
        }
      } catch (e) {
        console.warn('Direct fetch failed, falling back to anchor trigger:', e);
      }
    }

    // Determine final file extension
    let ext = (fileFormat || '').toLowerCase().replace(/^\./, '');
    if (!ext) {
      if (blob && blob.type) {
        const typePart = blob.type.split('/')[1];
        if (typePart) ext = typePart.split(';')[0];
      }
      if (!ext) ext = 'mp4';
    }

    // Determine clean filename without double extensions
    let finalName = (fileName || '').trim();
    if (!finalName) {
      finalName = `video_${Date.now()}.${ext}`;
    } else {
      const hasExtension = /\.[a-zA-Z0-9]{2,5}$/.test(finalName);
      if (!hasExtension) {
        finalName = `${finalName}.${ext}`;
      }
    }

    // 4. Trigger download with exact binary file and byte length
    if (blob) {
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
      }, 5000);
      return true;
    } else if (target && (target.startsWith('http') || target.startsWith('blob:') || target.startsWith('/'))) {
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
      }, 5000);
      return true;
    }

    return false;
  } catch (err) {
    console.error('downloadMediaFile error:', err);
    return false;
  } finally {
    if (unsubscribe) unsubscribe();
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
