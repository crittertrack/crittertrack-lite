# CritterTrack Lite — TODO

Feature backlog for the Android companion app. Nothing here is started unless noted.

## 1. Push notification preferences UI (done, not yet device-tested)
- Native push delivery (device registration, receiving, bell badge/`Notifications.jsx`) is
  fully working — confirmed end-to-end on-device.
- `Profile.jsx` now fetches `GET /api/push/preferences` and renders the same 8 category
  checkboxes as the main site (messages, requests, system, breeding, feeding, enclosureCare,
  careTasks, health), saving via `PUT` with optimistic toggle + rollback on failure.
- Still needs a build+deploy to the physical device to confirm it renders/saves correctly.

## 2. Dark mode (done, device-verified)
- `ThemeContext` (light/dark/auto, persisted to localStorage) ported from the main site and applied via `.dark` class on `<html>`.
- Theme toggle added to `Profile.jsx`, the global `BrandHeader`, and the pre-auth `Login.jsx`/`Register.jsx` screens.
- All pages/components swept for `dark:` classes; solid accent-colored buttons updated to `dark:bg-dark-accent`.
- `html`/`body` given an explicit themed background (fixes overscroll/safe-area gaps showing browser default white).
- `dark-bg` set to `#121212` (not pure black) since Lite exposes more bare page background than the desktop site.
- Confirmed working on physical device across two build+deploy cycles.

---
**Suggested order**: Push notification preferences (1) is a small, well-scoped addition to the existing Profile screen; Dark mode (2) is a larger cross-cutting sweep, best done once item 1 is in place to also host the theme toggle.
