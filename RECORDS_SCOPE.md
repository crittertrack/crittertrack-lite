# Lite "Records" Tab — Field Scope Analysis

Analysis of which record types/fields from `crittertrack-frontend`'s `AnimalFormModalV2.jsx`
are worth surfacing in crittertrack-lite's `AnimalDetail.jsx` "Records" tab (TODO item 1),
split by how useful each is to capture on the go from a phone vs. administrative/back-office
work better left to the desktop app.

## High value for Lite (quick-capture, happens in the moment)

**Vet Visits** — `date`, `reason`, `notes`
Simple, common, exactly the kind of thing you'd log right after leaving the vet.

**Medications** — `name`, `dose`, `reason`, `startDate`, `stopDate`, `intervalValue`/`intervalUnit`, `notes`
Dosing schedule fields worth capturing even without notification wiring yet.

**Vaccinations** — `date`, `name`, `notes`
Trivial fields, common to log immediately.

**Deworming Records** — `date`, `medication`, `notes`
Same shape as vaccinations, low effort to add alongside it.

## Medium value — worth including but simpler than main site

**Medical Conditions** — `condition`/`name`, `status`, `severity`, `notes`
Useful for tracking ongoing issues, but `status`/`severity` enums add UI complexity — could
ship as name+notes only first.

**Allergies** — `allergen`/`name`, `notes`
Same treatment as conditions — simple flat list.

## Low value for Lite (skip for now)

- **Parasite Control**, **Medical Procedures**, **Lab Results**, **Health Clearances** — more
  formal/clinical, usually transcribed from a printed document rather than logged in-the-moment;
  fine to leave read-only or omit entirely from v1.
- **Legal/Purchase-Sale/Rights**, **Shows**, **Milestones** — administrative paperwork, not
  something a breeder needs mid-chore on a phone. `RecordsTabContent.jsx` on the main site
  already owns this scope under a *different* tab name, and Lite doesn't need to replicate it.

## Other Animal-level fields (not push-notification scoping — just what exists on the animal)

`crittertrack-pedigree/utils/animalAlertsCron.js` shows what other fields live directly on the
Animal document (separate from `breedingRecords`/health arrays above), for completeness:

- `lastFedDate`, `feedingIntervalHours` — feeding schedule.
- `animalCareTasks[]` (`taskName`, `lastDoneDate`, `frequencyDays`), plus 19 dedicated
  grooming/special-care/training schedule fields (`groomingSchedule`, `brushingSchedule`,
  `bathingSchedule`, `specializedCareSchedule`/`specialCareSchedule`, `nailCareSchedule`,
  `beakHoofScaleSchedule`, `skinEarCareSchedule`, `dentalCareSchedule`, `healthMonitoringSchedule`,
  `exerciseSchedule`, `crateTrainingSchedule`, `litterTrainingSchedule`, `leashTrainingSchedule`,
  `freeFlightTrainingSchedule`, `workingRoleTrainingSchedule`, `behavioralIssueTrainingSchedule`,
  `reactivityTrainingSchedule`, `flightRiskTrainingSchedule`) — a "care schedule" tracker, not
  really "records" in the create/edit/delete sense, and out of scope for this tab for now.
- `quarantineDetails.status`/`type`/`reason`/`startDate`/`endDate` — not currently editable
  anywhere in Lite; out of scope for this pass.

`breedingRecords[]` (Litter-related, matings/births) and enclosure cleaning/supply-reorder
fields are excluded from this doc entirely — those are already owned by Lite's existing
`Breeding.jsx`/Litters tab and `Enclosures.jsx`, respectively, not the animal Records tab.

## Proposed Lite "Records" tab scope

Add create/edit/delete for: **Vet Visits, Medications, Vaccinations, Deworming**, plus
**Medical Conditions** and **Allergies** as a simpler name+notes list. Everything else stays
out of scope for now.

## Owner / Breeder identity — a gap outside the Records tab

Checked the rest of `AnimalDetail.jsx` (Summary tab) for other fields worth surfacing, since
"records" isn't the only thing that might be missing. Sale/stud fields (`isForSale`/
`salePriceAmount`/`salePriceCurrency`, `availableForBreeding`/`studFeeAmount`/`studFeeCurrency`)
are **already** fully editable there — no gap. But these identity fields aren't shown
anywhere in Lite (read-only or editable), which is a real gap for a pedigree app:

- `manualBreederName` / `breederId_public` — breeder name or linked breeder profile.
- `manualownerName` / `ownerId_public` — current owner name or linked owner profile.
- `coOwnership` — free-text co-owner note.

These belong on the **Summary** tab (identity info), not the Records tab — flagging here so
it isn't lost, but it's a separate follow-up from TODO item 1.
