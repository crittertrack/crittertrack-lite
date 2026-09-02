# CritterTrack Lite — TODO

Feature backlog for the Android companion app. Nothing here is started unless noted.

## 1. Push notification preferences UI (done, not yet device-tested)
- Native push delivery (device registration, receiving, bell badge/`Notifications.jsx`) is
  fully working — confirmed end-to-end on-device.
- `Profile.jsx` now fetches `GET /api/push/preferences` and renders the same 8 category
  checkboxes as the main site (messages, requests, system, breeding, feeding, enclosureCare,
  careTasks, health), saving via `PUT` with optimistic toggle + rollback on failure.
- Still needs a build+deploy to the physical device to confirm it renders/saves correctly.

## 2. Dark mode
- Not implemented anywhere in Lite yet.
- Check `/memories/repo/dark-mode-conversion-status.md` for the main site's conventions/class patterns before starting, to stay consistent.
- Add a theme toggle (surfaced from the profile screen, alongside item 1) and persist the choice (localStorage/Capacitor Preferences).
- Sweep all pages/components for hardcoded light-only colors.

---
**Suggested order**: Push notification preferences (1) is a small, well-scoped addition to the existing Profile screen; Dark mode (2) is a larger cross-cutting sweep, best done once item 1 is in place to also host the theme toggle.
