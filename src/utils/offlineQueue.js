// IndexedDB-backed queue for mutating requests (PUT/PATCH/DELETE) made while offline. Only
// updates/deletes to EXISTING records are queued here — POST (create) is deliberately excluded
// by the caller (apiClient.js), since create-flows often chain further calls off a
// server-generated id that doesn't exist yet while offline. Companion to offlineCache.js
// (read-side); shares the same IndexedDB connection/database via offlineDb.js.
import { openDb, QUEUE_STORE } from './offlineDb';

// Lets UI (e.g. OfflineBanner) show "N changes pending sync" without polling IndexedDB.
const notifyQueueChanged = async () => {
    try {
        window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { count: (await getQueuedWrites()).length } }));
    } catch {
        // Best-effort UI signal only — never let this throw into a caller's write path.
    }
};

export const enqueueWrite = async ({ method, url, data, headers }) => {
    try {
        const db = await openDb();
        const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, method, url, data, headers, timestamp: Date.now() };
        await new Promise((resolve, reject) => {
            const tx = db.transaction(QUEUE_STORE, 'readwrite');
            tx.objectStore(QUEUE_STORE).put(item);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        notifyQueueChanged();
        return item;
    } catch {
        return null;
    }
};

export const getQueuedWrites = async () => {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(QUEUE_STORE, 'readonly');
            const req = tx.objectStore(QUEUE_STORE).getAll();
            req.onsuccess = () => resolve((req.result || []).sort((a, b) => a.timestamp - b.timestamp));
            req.onerror = () => reject(req.error);
        });
    } catch {
        return [];
    }
};

export const removeQueuedWrite = async (id) => {
    try {
        const db = await openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(QUEUE_STORE, 'readwrite');
            tx.objectStore(QUEUE_STORE).delete(id);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        notifyQueueChanged();
    } catch {
        // Best-effort — a failed delete just means this item is retried again next flush.
    }
};

