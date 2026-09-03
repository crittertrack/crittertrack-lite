// Central axios instance — attaches baseURL + auth header automatically so call sites
// don't need to repeat `${API_BASE_URL}` and `Authorization: Bearer ${authToken}` everywhere.
// Also the single choke point where network-status/offline detection hooks in (see
// useOnlineStatus.js), which scattered raw `axios` calls could never provide.
// Mirrors crittertrack-frontend/src/utils/apiClient.js — keep in sync (both apps now share
// this same offline-cache/write-queue behavior).
import axios from 'axios';
import { API_BASE_URL } from './apiConfig';
import { cacheGet, cacheSet } from './offlineCache';
import { enqueueWrite, getQueuedWrites, removeQueuedWrite } from './offlineQueue';

const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Only PUT/PATCH/DELETE (edits/deletes to existing records) get queued while offline — POST
// (create) is excluded since create-flows often chain further calls off a server-generated id
// that doesn't exist yet while offline (see offlineQueue.js).
const QUEUEABLE_METHODS = new Set(['put', 'patch', 'delete']);

// By the time a request fails, axios has already serialized config.data into a JSON string
// (if it started as a plain object) — parse it back so the queued item can be replayed later
// via apiClient[method](url, data) exactly like the original call site invoked it.
const parseQueuedData = (data) => {
    if (typeof data !== 'string') return data;
    try { return JSON.parse(data); } catch { return data; }
};

// Cache key covers the request path + any query params, so distinct queries against the same
// endpoint (e.g. different filters) don't clobber each other's cached data.
const cacheKeyFor = (config) => `${config.url}${config.params ? `?${JSON.stringify(config.params)}` : ''}`;

// A request that never reached the server (no `error.response`) means the network is
// down/unreachable, as opposed to the server responding with a 4xx/5xx. Broadcast that
// distinction globally so any component (e.g. useOnlineStatus) can react without every
// call site needing its own try/catch classification logic.
apiClient.interceptors.response.use(
    (response) => {
        window.dispatchEvent(new CustomEvent('api-network-status', { detail: { online: true } }));
        // Fire-and-forget: cache successful GET bodies so they can be served back when offline.
        if (response.config.method === 'get') {
            cacheSet(cacheKeyFor(response.config), response.data);
        }
        return response;
    },
    async (error) => {
        if (!error.response) {
            window.dispatchEvent(new CustomEvent('api-network-status', { detail: { online: false } }));
            // Only GET requests get served from cache — writes must never be silently
            // faked while offline, so those still reject and the caller handles the failure.
            if (error.config?.method === 'get') {
                const cached = await cacheGet(cacheKeyFor(error.config));
                if (cached) {
                    return {
                        data: cached.data,
                        status: 200,
                        statusText: 'OK (from offline cache)',
                        headers: {},
                        config: error.config,
                        fromCache: true,
                        cachedAt: cached.timestamp,
                    };
                }
            }
            // Edits/deletes get queued for automatic replay once back online, and resolve
            // optimistically here so call sites behave the same as a normal success (their
            // own follow-up refetch will just see the pre-write cached data until synced).
            if (error.config?.method && QUEUEABLE_METHODS.has(error.config.method)) {
                const data = parseQueuedData(error.config.data);
                await enqueueWrite({ method: error.config.method, url: error.config.url, data });
                return {
                    data: data || {},
                    status: 202,
                    statusText: 'Queued (offline)',
                    headers: {},
                    config: error.config,
                    queued: true,
                };
            }
        }
        return Promise.reject(error);
    }
);

// Sends every queued write to the server in original order, dropping items the server itself
// rejects (4xx/5xx — that write is broken, not just blocked by connectivity) so they can't
// stall everything queued after them. Safe to call repeatedly — no-ops while already running.
let flushing = false;
export const flushWriteQueue = async () => {
    if (flushing) return;
    flushing = true;
    try {
        const queued = await getQueuedWrites();
        for (const item of queued) {
            try {
                await apiClient({ method: item.method, url: item.url, data: item.data });
            } catch (err) {
                if (!err.response) break; // still offline — stop, retry the rest next reconnect
                // Server permanently rejected this specific write (e.g. the record was changed
                // or deleted in the meantime) — surface it so the user isn't left wondering why
                // an offline edit silently never applied, instead of just dropping it unseen.
                window.dispatchEvent(new CustomEvent('offline-write-failed', {
                    detail: { method: item.method, url: item.url, status: err.response.status },
                }));
            }
            await removeQueuedWrite(item.id);
        }
    } finally {
        flushing = false;
    }
};

let wasOnline = true;
window.addEventListener('api-network-status', (e) => {
    if (e.detail.online && !wasOnline) flushWriteQueue();
    wasOnline = e.detail.online;
});

// Prefetching (prefetchAppData) and whichever page is currently mounted often request the same
// GET endpoint (e.g. /animals) within the same tick right after login — without this, that's a
// real duplicate network request every single load. Concurrent identical GETs now share one
// in-flight request instead; safe since GETs are side-effect-free, unlike writes.
const inFlightGets = new Map();
const rawGet = apiClient.get.bind(apiClient);
apiClient.get = (url, config) => {
    const key = `${url}${config?.params ? `?${JSON.stringify(config.params)}` : ''}`;
    if (inFlightGets.has(key)) return inFlightGets.get(key);
    const promise = rawGet(url, config).finally(() => inFlightGets.delete(key));
    inFlightGets.set(key, promise);
    return promise;
};

export default apiClient;
