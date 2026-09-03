// Caches successfully-loaded photos (animal/enclosure images) as Blobs in IndexedDB, keyed by
// URL, so <img> tags can fall back to a locally-stored copy when the live URL fails to load
// (offline). See offlineDb.js for the shared IndexedDB connection this uses.
import { openDb, IMAGE_STORE } from './offlineDb';

const blobSet = async (url, blob) => {
    try {
        const db = await openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(IMAGE_STORE, 'readwrite');
            tx.objectStore(IMAGE_STORE).put(blob, url);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    } catch {
        // Best-effort — a failed cache write must never break normal image loading.
    }
};

const blobGet = async (url) => {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(IMAGE_STORE, 'readonly');
            const req = tx.objectStore(IMAGE_STORE).get(url);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    } catch {
        return null;
    }
};

const blobHas = async (url) => {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(IMAGE_STORE, 'readonly');
            const req = tx.objectStore(IMAGE_STORE).getKey(url);
            req.onsuccess = () => resolve(!!req.result);
            req.onerror = () => reject(req.error);
        });
    } catch {
        return false;
    }
};

// Fire-and-forget: fetches and caches the image if not already cached. Safe to call on every
// render — skips the network fetch entirely once a URL is already cached, and any failure
// (offline, CORS, 404) is silently ignored since this is just a background cache warm-up.
// Callers (AnimalImage mounts, prefetchOfflineData) can total in the hundreds at once (e.g.
// right after login) — a shared concurrency limit + same-session dedupe below keeps that from
// flooding the network/IndexedDB all at once, which was making the whole app feel slow to load.
const MAX_CONCURRENT_WARMS = 4;
let activeWarms = 0;
const warmQueue = [];
const requestedThisSession = new Set();

const runNextWarm = () => {
    if (activeWarms >= MAX_CONCURRENT_WARMS || warmQueue.length === 0) return;
    activeWarms++;
    const { url, resolve } = warmQueue.shift();
    doWarm(url).finally(() => {
        activeWarms--;
        resolve();
        runNextWarm();
    });
};

const doWarm = async (url) => {
    if (await blobHas(url)) return;
    try {
        const res = await fetch(url);
        if (!res.ok) return;
        await blobSet(url, await res.blob());
    } catch {
        // Not cached yet — will retry next time this image renders successfully.
    }
};

export const warmImageCache = (url) => {
    if (!url || requestedThisSession.has(url)) return Promise.resolve();
    requestedThisSession.add(url);
    return new Promise((resolve) => {
        warmQueue.push({ url, resolve });
        runNextWarm();
    });
};

// Returns a local blob: object URL for a previously-cached image, or null if never cached.
// Caller is responsible for revoking the returned URL when done with it.
export const getCachedImageObjectUrl = async (url) => {
    if (!url) return null;
    const blob = await blobGet(url);
    return blob ? URL.createObjectURL(blob) : null;
};
