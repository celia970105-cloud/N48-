// IndexedDB & LocalStorage persistent storage utility for large team videos

const DB_NAME = 'PregnancyTeamVideoDB';
const DB_VERSION = 2;
const STORE_NAME = 'saved_videos';
const VIDEO_KEY = 'team_presentation_video';
const LOCAL_STORAGE_KEY = 'team_persisted_video_meta';

export interface SavedVideoRecord {
  id: string;
  blob?: Blob;
  buffer?: ArrayBuffer;
  name: string;
  size: number;
  type: string;
  savedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveVideoToIndexedDB(
  fileOrBlob: Blob,
  metadata: { name: string; size: number; type: string }
): Promise<void> {
  try {
    const db = await openDB();
    
    // Safely convert to ArrayBuffer to prevent Safari/iOS DataCloneError with Blobs
    let arrayBuffer: ArrayBuffer | null = null;
    try {
      arrayBuffer = await fileOrBlob.arrayBuffer();
    } catch (_) {
      // Fallback if arrayBuffer() is unavailable
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record: SavedVideoRecord = {
        id: VIDEO_KEY,
        buffer: arrayBuffer || undefined,
        blob: arrayBuffer ? undefined : fileOrBlob,
        name: metadata.name,
        size: metadata.size,
        type: metadata.type || 'video/mp4',
        savedAt: Date.now(),
      };

      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('saveVideoToIndexedDB error:', err);
  }
}

export async function getVideoFromIndexedDB(): Promise<{ blob: Blob; name: string; size: number; type: string; savedAt: number } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(VIDEO_KEY);

      req.onsuccess = () => {
        const record = req.result as SavedVideoRecord | undefined;
        if (!record) {
          resolve(null);
          return;
        }

        let blob: Blob | null = null;
        if (record.buffer) {
          blob = new Blob([record.buffer], { type: record.type || 'video/mp4' });
        } else if (record.blob) {
          blob = record.blob;
        }

        if (blob) {
          resolve({
            blob,
            name: record.name,
            size: record.size,
            type: record.type,
            savedAt: record.savedAt,
          });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to load video from IndexedDB:', err);
    return null;
  }
}

export async function deleteVideoFromIndexedDB(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(VIDEO_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to delete video from IndexedDB:', err);
  }
}

// LocalStorage helpers for instant synchronous metadata cache
export function getPersistedVideoFromLocalStorage(): any | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to read video from localStorage:', e);
  }
  return null;
}

export function savePersistedVideoToLocalStorage(data: any): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save video to localStorage:', e);
  }
}

export function removePersistedVideoFromLocalStorage(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (e) {}
}
