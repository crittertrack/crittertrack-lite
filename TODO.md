# CritterTrack Lite — TODO

Feature backlog for the Android companion app. Nothing here is started unless noted.

## 1. Push notification preferences UI (done, device-verified)
- Native push delivery (device registration, receiving, bell badge/`Notifications.jsx`) is
  fully working — confirmed end-to-end on-device.
- `Profile.jsx` fetches `GET /api/push/preferences` and renders checkboxes for only the 5
  categories relevant to Lite (breeding, feeding, enclosureCare, careTasks, health) — messages/
  requests/system are filtered out client-side since Lite has no messaging or ownership-transfer
  UI yet, even though the shared backend endpoint returns all 8 categories. Saves via `PUT` with
  optimistic toggle + rollback on failure.
- Removed a duplicate copy of this same UI that had also been added to `Notifications.jsx` (the
  bell-icon page) — preferences now live only in `Profile.jsx`.
- Build+deploy to the physical device confirmed working.

## 2. Dark mode (done, device-verified)
- `ThemeContext` (light/dark/auto, persisted to localStorage) ported from the main site and applied via `.dark` class on `<html>`.
- Theme toggle added to `Profile.jsx`, the global `BrandHeader`, and the pre-auth `Login.jsx`/`Register.jsx` screens.
- All pages/components swept for `dark:` classes; solid accent-colored buttons updated to `dark:bg-dark-accent`.
- `html`/`body` given an explicit themed background (fixes overscroll/safe-area gaps showing browser default white).
- `dark-bg` set to `#121212` (not pure black) since Lite exposes more bare page background than the desktop site.
- Confirmed working on physical device across two build+deploy cycles.

## 3. Offline compatibility (in progress)
- Step 1 DONE: read-caching. `src/utils/offlineCache.js` (IndexedDB, via shared connection
  module `offlineDb.js`) caches every successful GET response body (fire-and-forget); when a GET
  fails with no `error.response` (network unreachable), `apiClient.js` transparently serves the
  last cached body instead of rejecting — applies to every page automatically since they all
  already go through `apiClient.get`.
- Step 2 DONE: eager prefetch. `src/utils/prefetchOfflineData.js` fires all core list requests
  (`/animals`, `/enclosures`, `/litters`, `/supplies`, `/users/general-tasks`, `/collections`,
  `/species`, `/push/preferences`) as soon as the user is authenticated (`App.js`), and again on
  reconnect — so pages have cached data ready even if their tab was never opened yet, instead of
  only caching lazily per-visit.
- Step 3 DONE: offline photo cache. `src/utils/offlineImageCache.js` caches photo blobs in
  IndexedDB, keyed by URL. The shared `AnimalImage.jsx` component warms the cache on every
  successful photo load and falls back to a cached blob on load failure (offline) — covers ~8
  call sites automatically. `Enclosures.jsx` thumbnails and `BrandHeader.jsx`'s profile photo
  were switched to use `AnimalImage` for the same benefit. Prefetch also eagerly warms images
  for animals/enclosures up front (not just on page visit).
- Step 4 DONE: write queue + sync-on-reconnect. `src/utils/offlineQueue.js` (IndexedDB, shared
  connection) queues PUT/PATCH/DELETE requests that fail while offline; `apiClient.js` resolves
  those calls optimistically (`status: 202, queued: true`) instead of rejecting, so existing call
  sites don't need per-page changes. On reconnect, `flushWriteQueue()` replays the queue in order,
  dropping any item the server itself rejects (4xx/5xx) so it can't block later independent
  writes. POST (create) is deliberately excluded — create-flows often chain further calls off a
  server-generated id that doesn't exist yet while offline.
- Step 5 DONE: staleness/pending-sync indicator. `OfflineBanner.jsx` now also shows a live count
  of queued-but-unsynced writes (via `useQueuedWriteCount.js`), both while offline ("N changes
  will sync once you're back online") and while flushing right after reconnecting ("Syncing N
  pending changes…").
- Also fixed along the way: `Enclosures.jsx` and `Notifications.jsx` both used `Promise.all` for
  multi-endpoint fetches, which meant a single cache-miss endpoint blanked out ALL the data even
  when other endpoints DID have valid cached responses — switched both to `Promise.allSettled`.
  Also fixed `OfflineBanner` visually overlapping the sticky `BrandHeader`/`TopBar` (was
  `position: fixed`, now `sticky`).
- Known limitation, ADDRESSED: queued writes are optimistic at the network layer only — most
  pages' own "refresh after save" logic used to show pre-write cached data until the queue
  actually flushed and a fresh fetch happened. Fixed by replacing "write then refetch" with
  "write then patch known fields into local state directly" across the main mutating handlers in
  `Breeding.jsx` (litter stage transitions), `Notifications.jsx` (all quick actions), and
  `Enclosures.jsx`/`EnclosureDetailModal.jsx` (edit enclosure, assign/remove animal). Also found
  and fixed a related bug while doing this: `AnimalDetail.jsx`'s save/assign-parent/photo handlers
  assumed the PUT response was always the full updated document (`setAnimal(response.data)`) —
  wrong once a write is queued, since the synthetic queued response only echoes back the partial
  sent payload. Fixed via a safe merge pattern instead:
  `setState((prev) => ({ ...prev, ...knownPayloadSent, ...response.data }))`, which works whether
  the response is a real full document or an echoed partial payload.
- Not yet done: conflict handling if a queued write's target record changed server-side (or was
  deleted) before it syncs — currently that write is still dropped on a 4xx/5xx from the server,
  BUT this is no longer silent: `flushWriteQueue()` now dispatches an `offline-write-failed` event
  when this happens, and a new `SyncFailureBanner.jsx` (mounted in `App.js`) shows a small
  dismissible notice ("A change made while offline couldn't be synced — the record may have
  changed or been removed") instead of the user never finding out.

---
**Suggested order**: Push notification preferences (1) is a small, well-scoped addition to the existing Profile screen; Dark mode (2) is a larger cross-cutting sweep, best done once item 1 is in place to also host the theme toggle.
