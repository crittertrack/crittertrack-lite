// GET response cache — see offlineDb.js for the shared IndexedDB connection this uses.
// Lets apiClient serve last-known data when a request fails due to no network, instead of
// every page showing an empty/error state while offline. Caching failures are always
// non-fatal (best-effort only).
import { openDb, CACHE_STORE } from './offlineDb';

export const cacheSet = async (key, data) => {
    try {
        const db = await openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(CACHE_STORE, 'readwrite');
            tx.objectStore(CACHE_STORE).put({ data, timestamp: Date.now() }, key);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    } catch {
        // Best-effort — a failed cache write must never break the actual API response.
    }
};

export const cacheGet = async (key) => {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(CACHE_STORE, 'readonly');
            const req = tx.objectStore(CACHE_STORE).get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    } catch {
        return null;
    }
};
