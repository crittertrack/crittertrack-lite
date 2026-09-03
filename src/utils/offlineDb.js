// Shared IndexedDB connection for crittertrack-lite's offline layer. offlineCache.js (GET
// response cache), offlineQueue.js (pending write queue), and offlineImageCache.js (photo
// blobs) all use this single connection — opening separate connections to the same database
// from different modules risks a later `indexedDB.open()` call hanging on `onupgradeneeded`
// while an earlier connection is still open (IndexedDB only allows one version-upgrade
// transaction at a time per database).
export const DB_NAME = 'crittertrack-lite-cache';
export const DB_VERSION = 3;
export const CACHE_STORE = 'apiCache';
export const QUEUE_STORE = 'writeQueue';
export const IMAGE_STORE = 'imageCache';

let dbPromise = null;

export const openDb = () => {
    if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB unavailable'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(CACHE_STORE)) db.createObjectStore(CACHE_STORE);
            if (!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(IMAGE_STORE)) db.createObjectStore(IMAGE_STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return dbPromise;
};
