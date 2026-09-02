# CritterTrack Lite — TODO

Feature backlog for the Android companion app. Nothing here is started unless noted.

## 1. Records — add + edit
- `AnimalDetail.jsx` "Records" tab currently only renders `animal.breedingRecords` read-only — no create/edit UI exists.
- Add a form (modal or inline) to create a new record (type, date, notes, etc. — match fields used by `crittertrack-frontend`'s record model).
- Add edit-in-place for existing records (tap a record → edit → save).
- Add delete/remove for a record.
- Wire to whatever record endpoints the backend already exposes (check `crittertrack-pedigree/routes` for the record routes the main site uses before inventing new ones).

## 2. Photos — add/remove
- `AnimalDetail.jsx` "Photos" tab only displays the single `imageUrl`/`photoUrl` — no gallery, no upload, no delete.
- Add photo upload (camera + gallery picker via Capacitor) and wire to the existing animal image upload endpoint.
- Support multiple photos if the backend model allows it (check main site's gallery/photo array support), otherwise support replacing the single photo.
- Add a delete/remove action per photo.

## 3. Parents — assign/unassign
- No UI currently exists in Lite to set/change/clear `sireId_public`/`fatherId_public` or `damId_public`/`motherId_public` — pedigree chart is read-only lookup.
- Add an "Assign Parent" flow (search/select an existing animal as sire or dam) from `AnimalDetail.jsx`.
- Add "Unassign"/clear parent action.
- Reuse the public animal search endpoint already used for breeder profile lookups where possible.

## 4. In-app account registration
- `Login.jsx` is the only auth page — no registration/sign-up flow exists in Lite.
- Add a "Create Account" screen/flow (username, email, password, confirm) hitting the main site's existing register endpoint.
- Handle validation errors + success → auto-login or redirect to Login.

## 5. Dark mode
- Not implemented anywhere in Lite yet.
- Check `/memories/repo/dark-mode-conversion-status.md` for the main site's conventions/class patterns before starting, to stay consistent.
- Add a theme toggle (likely surfaced from the new profile screen — see item 7) and persist the choice (localStorage/Capacitor Preferences).
- Sweep all pages/components for hardcoded light-only colors.

## 6. Push notifications
- Not implemented in Lite. Main site has an existing push notification system — check `/memories/repo/push-notifications-system.md` for the architecture to mirror (or hook into) before building.
- Add Capacitor Push Notifications plugin + device token registration against the backend.
- Add notification preferences UI (see item 7 — profile screen).
- Add the animal-specific notification pieces to Records (e.g. reminders/due dates tied to a record should be able to schedule/cancel a push notification) — needs its own sub-tasks once the Records edit UI (item 1) exists:
  - [ ] Schedule notification when a record with a future date is created/edited.
  - [ ] Cancel/update the scheduled notification when that record is edited or deleted.
  - [ ] Surface notification status/toggle per-record in the Records UI.

## 7. Profile screen (tap profile image)
- No profile/settings screen exists yet in Lite.
- Tapping the profile image (wherever it's shown, e.g. `TopBar.jsx`) should open a profile screen supporting:
  - [ ] Edit basic profile info (personal name, breeder name, etc.)
  - [ ] Edit basic privacy settings (`showPersonalName`/`showBreederName` and any others used by `/public/profiles/search`)
  - [ ] Change password
  - [ ] Edit push notification preferences (depends on item 6)
  - [ ] Dark mode toggle (depends on item 5)

---
**Suggested order**: Records edit (1) → Photos (2) → Parents (3) unblock the core AnimalDetail experience first; Registration (4) and Profile screen (7) are independent and can happen in parallel; Dark mode (5) and Push notifications (6) are cross-cutting and best done once the profile screen (7) exists to host their settings UI.
