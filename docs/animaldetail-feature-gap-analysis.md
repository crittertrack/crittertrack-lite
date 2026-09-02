# AnimalDetail (Lite) vs. AnimalModalV2 (Main Site) — Feature Gap Analysis

Lite's `src/pages/AnimalDetail.jsx` currently has 4 tabs: **Summary, Records, Photos, Pedigree**.
The main site's `AnimalModalV2.jsx` has 11: **Dashboard, Identification, Appearance, Health,
Routine Care, Behavior, Breeding, Pedigree, Gallery, Timeline, Records**.

This doc catalogs what each main-site tab contains and recommends what's actually worth
bringing into Lite, given Lite's goal (quick companion app, not a full replacement).

## Tier 1 — Recommended (high value, low complexity)

- **Genetic Info (Appearance tab)**: Phenotype, Carried Genes, Possible Carried Genes, Genotype
  (`geneticCode`, already shown). Lite already derives "Variety" from color/markings/coat/earset/
  eyeColor/body — adding computed **Phenotype** (via `getAnimalPhenotypeDisplay`) would need
  porting non-trivial genetics logic, so treat as a stretch goal, not a quick win.
- **Identification Numbers**: `microchipNumber`, `breederAssignedId`, `tattooId`, `ringId`,
  `eartagNumber`, `pedigreeRegistrationId`, custom `identifiers[]`. Simple fields, easy `Row`
  additions to Summary if the user's animals actually use them.
- **Tags**: `animal.tags[]` — simple chip list, easy to add to Summary.
- **Enclosure name** (not just raw ID): Lite's Records tab shows `animal.enclosureId` as a raw
  string; main site fetches `GET /enclosures/:id` and shows the enclosure's name/details. Lite
  already has an Enclosures feature — worth resolving the name here too.
- **Coefficient of Inbreeding (COI) + Average Kinship**: `GET /animals/:id/inbreeding` — main
  site's Pedigree tab shows this prominently. Lite's Pedigree tab already fetches parents/
  offspring; adding a COI/AVK card would fit naturally and the endpoint already exists.
- **Status badges row**: main site shows Owned/Not Owned, Public/Private, Status, Life Stage,
  Health Status, Reproduction state (Pregnant/Nursing/Mating) as compact pill badges under the
  name. Lite just added the Owned/Not Owned badge — Life Stage + reproduction state badges
  (`isPregnant`/`isNursing`/`isInMating`/`isPlannedMating`) would be cheap additions if these
  fields are populated for Lite's users.

## Tier 2 — Worth considering (more effort, depends on real usage)

- **Health Summary / Health tab**: Health Status & Preventive Care, Active Medical Records,
  Veterinary Care, Health Clearances, End of Life Info. Lite's Records tab only shows
  `breedingRecords`. A simplified "Health" section (just active medical records + vet visits)
  could be added if Lite users track this data — but it's a big tab on the main site, don't
  port all of it.
- **Breeding tab**: Reproductive Status, Estrus/Cycle info, Mating & Conception History,
  Pregnancy & Development, Sire/Dam-specific info, Breeding Records, Nursing & Dependency,
  Artificial Reproduction Methods. Lite already has a dedicated `Breeding.jsx` (litters) page —
  most of this is already served at the app level rather than per-animal. Low priority to
  duplicate per-animal.
- **Timeline tab**: Aggregated event feed (same data source as "Recent Activity" on the main
  site's Dashboard tab). Could be a nice single addition to Lite's Records tab instead of a
  whole new tab — shows a chronological history without needing separate Health/Care/Behavior
  tabs.
- **Offspring & Litters (Dashboard)**: Lite's Pedigree tab already shows offspring groups — this
  is functionally covered already.
- **Relationship insights (Dashboard)**: Grandparents/aunts-uncles/cousins/nieces-nephews
  breakdown. Interesting but a lot of relationship-computation logic to port for a "quick
  companion app" — low priority.

## Tier 3 — Skip (redundant, out of scope, or needs infra Lite doesn't have)

- **Routine Care tab**: Nutrition/Feeding, Enclosure environment (lighting/noise/enrichment),
  Cleaning/Grooming schedules, Shedding/Molting history, Water quality checks. This is deep
  husbandry tracking — out of scope for a lightweight companion app.
- **Behavior tab**: Temperament, Training status/schedules, Known issues. Niche, low usage
  likelihood for most species tracked in Lite.
- **Gallery tab**: Multi-image gallery with thumbnails. Lite's Photos tab already shows the
  single main image; a multi-image gallery is a reasonable future add but not urgent unless
  users are attaching `extraImages`.
- **Records tab extras**: Licensing/Permits, Legal/Administrative, Restrictions, Purchase/Sale
  Information, Owner History, Show Titles & Ratings, Working & Performance, Milestones. This is
  breeder-business/legal record-keeping — very unlikely to be needed in a quick mobile
  companion view.
- **Public/Private (`isDisplay`) toggle**: Ties into the Marketplace/Public Profile system,
  which Lite doesn't implement. Skip unless Lite ever gets a public-facing view.
- **For Sale / Stud badges + pricing**: Marketplace-related, same reasoning — skip.
- **Breeder/Owner profile lookups** (`GET /public/profiles/search`): Fetches public profile info
  for the breeder/owner — only useful if Lite ever shows animals from other users' profiles.
  Currently out of scope.
- **Breeding Lines**: Custom line-tracking with color coding — a fairly advanced main-site-only
  feature (`breedingLineColor.js`, `toggleAnimalBreedingLine`). Skip unless specifically
  requested.
- **Transfer / Archive / Share actions**: Main site's header has Transfer, Archive, Add Sibling,
  Share buttons with a lot of supporting state (`onTransfer`, `onArchive`, `handleAcceptTransfer`,
  etc.). Lite doesn't have transfer/archive flows built at all yet — would be a much bigger
  feature addition than a "detail page enhancement," should be scoped separately if wanted.

## Suggested next step

If you want to act on this, Tier 1 items are the best next batch: Identification fields + Tags
+ resolved Enclosure name are quick `Row` additions to Summary/Records, and COI/Average Kinship
is a natural fit for the existing Pedigree tab since the backend endpoint already exists.
