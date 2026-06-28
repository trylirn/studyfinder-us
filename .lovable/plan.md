# Phase 2 — Map, Clinics, Portal, Imports & Directory Polish

## 1. Map View + ZIP radius

- Install `leaflet` + `react-leaflet`; load CSS via `<link>` in `__root.tsx` head (no `@import` in styles.css per Tailwind v4 rules).
- New `src/components/TrialMap.tsx` (client-only, dynamic import to avoid SSR `window` crash). Pins per location with popup: facility name, city/state, status, link.
- Bundle US ZIP centroid dataset (`src/data/zip-centroids.json`, ~33k ZIPs lat/lng) — offline lookup, no API.
- New `nearby_sites(zip, radius_mi, nct_id?)` SQL function (haversine on `locations.lat/lng`) + `nearbySites` server fn.
- Backfill `lat`/`lng` during import from ClinicalTrials.gov `geoPoint`. Admin one-shot "Geocode backfill" button on `/admin` for existing rows.
- Wire into:
  - Study detail page: map under "Research Sites" + ZIP+radius input (default 50mi) that filters both list and map.
  - `/search`: optional "Map" toggle button.

## 2. Clinic Profiles (public)

- Derive clinics from existing `locations` (facility + city + state + zip) into the `clinics` table via admin job: dedupe by normalized name+city+state, attach lat/lng, link via new `clinic_id` FK on `locations` (nullable).
- Routes:
  - `/clinics` — paginated, filterable list (search by name, filter by state, specialty).
  - `/clinics/$slug` — hero (name, address, map pin, phone/website if known), photo gallery, specialties, **active recruiting trials at this clinic** list, "Claim this clinic" CTA.
- Add `clinic_id` to study detail "Research Sites" rows: each site links to clinic profile when matched.
- Sitemap: include all clinic slugs.

## 3. Clinic Onboarding Portal

- Routes under `/_authenticated/portal/` (gated by `clinic_admin` OR `admin` role):
  - `/portal` — dashboard (claimed clinics, plan, lead delivery log metadata).
  - `/portal/claim` — search clinics → submit claim (creates pending row, admin approves).
  - `/portal/clinic/$id` — edit profile: phone, website, intake_email, intake_webhook_url, specialties, description, hero image, gallery (Lovable Cloud storage bucket `clinic-images`).
  - `/portal/billing` — Stripe Checkout for `featured` / `premium` plans; sets `plan` + `featured_until`.
- Admin (`/admin`):
  - "Approve clinic claims" queue.
  - "Generate clinics from locations" job.
- Sign-up: `/auth` gains "Clinic Operator sign up" tab → creates user + assigns `clinic_admin` role. (Patient accounts remain disabled.)
- New `/api/public/stripe-webhook` verifying signature, updating `plan` + `featured_until`.
- Premium placement: featured clinics surface first on `/clinics`, condition, state, and city pages (badge + sort boost while `featured_until > now()`).

## 4. More imports (populate the directory)

- Expand `runImport` in `src/lib/import.functions.ts`:
  - Paginate ClinicalTrials.gov v2 API with `pageToken` until exhausted or admin-set cap (default 50k).
  - Per-condition seed list (top 60 conditions: cancer, diabetes, depression, obesity, Alzheimer's, ADHD, MS, lupus, etc.) to broaden coverage.
  - Per-state seed pass to ensure even geographic distribution.
  - Persist `lat`/`lng` from `geoPoint`.
- Schedule daily refresh via `pg_cron` → `/api/public/hooks/import-refresh` (pulls trials updated in last 48h).
- Admin UI shows last run, progress, and "Import next 5k" / "Full sync" buttons.

## 5. Directory filters & pagination (the bugs you flagged)

- `/conditions`: search box (client filter on already-loaded list) + sort (A–Z / by count) + pagination (200/page server-side from `conditions` table ordered by `study_count desc`).
- `/sponsors`: same — search, sort, **server-side pagination** (currently truncated; will list *all* sponsors).
- `/states`: search box + sort.
- `/recruiting`: filters for state, phase, condition + pagination (already paginated underneath; surface controls).
- New `listConditionsPaged`, `listSponsorsPaged` server fns with `q`, `page`, `pageSize`, `sort`.

## 6. Fix inaccurate study counts on condition/sponsor cards

Root cause: `conditions.study_count` and `sponsors.study_count` are snapshot totals (all studies referencing the term), but the detail pages filter to non-broken / displayable studies (have summary, valid status, not WITHDRAWN/TERMINATED) — so the visible list is smaller. Sometimes also larger when default filters exclude a status the count includes.

Fix:
- Recompute `study_count` using the **same predicate** the detail pages use:
  - `overall_status NOT IN ('WITHDRAWN','TERMINATED')`
  - `brief_summary IS NOT NULL`
  - For conditions: array-contains match.
  - For sponsors: `sponsor_slug = X`.
- New SQL function `refresh_directory_counts()` run at end of every import + nightly cron.
- Condition/sponsor detail pages display the same count via `count: 'exact'` on the actual filtered query, so card count === page count by construction.

## 7. Homepage "Browse by clinic"

- New section between "Top sponsors" and "New to clinical trials?":
  - Heading "Browse research clinics" + "All clinics →".
  - Grid of 12 top clinics by active recruiting trial count, with name, city/state, recruiting count, featured badge if applicable.
- Backed by new `getHomeData` field `topClinics` (cached).

---

## Technical notes

### New / changed DB

- `clinics`: add `description`, `hero_image_url`, `claim_status` (`pending|approved|rejected`), `recruiting_count` (denormalized), `updated_at`.
- `locations`: add `clinic_id uuid references clinics(id)` (nullable, indexed).
- New storage bucket `clinic-images` (public read, write via portal owner).
- SQL: `nearby_sites(zip text, radius_mi int, nct_id text default null)`, `refresh_directory_counts()`, trigger to bump `clinics.recruiting_count` on location/study change (or run inside refresh job).
- New table `clinic_claims(id, user_id, clinic_id, status, note, created_at)`.

### New server fns / routes

- `src/lib/clinics.functions.ts`: `listClinics`, `getClinic`, `submitClaim`, `getMyClinics`, `updateMyClinic`, `uploadClinicImage`, `startPremiumCheckout`.
- `src/lib/geo.functions.ts`: `nearbySites`, ZIP→lat/lng helper.
- `src/routes/clinics.index.tsx`, `clinics.$slug.tsx`.
- `src/routes/_authenticated/portal.tsx` (layout) + children.
- `src/routes/api/public/stripe-webhook.ts`.
- `src/routes/api/public/hooks/import-refresh.ts`.

### Integrations

- **Stripe** connector (premium placement) — will request enablement when reaching step 3.
- **Leaflet + OSM tiles** — no key.
- ZIP dataset bundled (~1.5 MB JSON; tree-shaken to lat/lng only).

### Out of scope this phase

- AACT Postgres mirror sync (still v3).
- SMS/Twilio lead delivery.
- Patient accounts.

### Implementation order

1. DB migrations (clinics/locations/claims/SQL fns) + storage bucket.
2. Count-accuracy fix + directory filters/pagination (quick wins, ships independently).
3. Import expansion + lat/lng backfill + daily cron.
4. Map component + ZIP radius on study detail and `/search`.
5. Clinic generation job → public `/clinics` + `/clinics/$slug` + homepage section.
6. Onboarding portal + Stripe premium.

Approve and I'll start at step 1.
