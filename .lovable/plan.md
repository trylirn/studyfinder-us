
## 1. "Claim this clinic" routes to clinic portal, not admin

`src/routes/clinics.$slug.tsx` links `to="/auth"` (admin). Change to `to="/clinics/auth"` with `search={{ mode: "signup" }}`, and preserve the target clinic slug via a `?next=/portal/claim?clinic=<slug>` param. Update `clinics.auth.tsx` to validate a `next` search param and redirect there after successful sign‑in/sign‑up (falling back to `/portal`). Update `portal.claim.tsx` to read a `?clinic=<slug>` search param and pre‑select that clinic (looking it up via `listClinics` by slug).

## 2. Sign out from clinic dashboard

Add a "Sign out" button to `src/routes/_authenticated/portal.tsx` nav (right side). On click: `await supabase.auth.signOut()` then `navigate({ to: "/clinics/auth" })`. Also show the signed‑in email next to it.

## 3. Proof of ownership on claim form

Expand `portal.claim.tsx`:
- Add fields: **Job title/role**, **Relationship to clinic** (dropdown: Owner, Administrator, Principal Investigator, Staff, Marketing/Comms, Other), **NPI number** (optional), **Work website URL** (optional).
- Add **proof upload** (1–3 files: business card, staff ID badge, letterhead, employment verification). Upload to existing private `clinic-images` bucket under `claims/<userId>/<uuid>-<filename>`; store returned storage paths on the claim record.
- Add mandatory attestation checkbox: "I confirm I am authorized to manage this clinic's profile."
- Extend `submitClinicClaim` server fn (`src/lib/clinics.functions.ts`) input schema + insert to persist the new fields.
- Migration: add columns to `public.clinic_claims`: `role text`, `relationship text`, `npi text`, `work_website text`, `proof_paths text[]`, `attested boolean not null default false`. (Admin review UI in `_authenticated/admin.tsx` will surface these + signed URLs for the proof files.)

## 4. State filter on `/clinics` not working

`listClinics` compares `clinics.state` with the option's `abbr` (e.g. `MD`) but `clinics.state` stores the full name (e.g. `Maryland`). Fix by: passing state **slug** from the `<select>` (`value={st.slug}`), and in `listClinics` resolving slug → both `name` and `abbr` via the `states` table, then filtering `state.in.(Name,ABBR)`. This makes the filter robust regardless of how imports stored the state string.

## 5. Richer clinic profile with map

Update `src/routes/clinics.$slug.tsx`:
- Add a **Leaflet map** (reuse `TrialMapInner`) centered on the clinic lat/lng with a marker; fall back to geocoding via zippopotam.us when lat/lng missing (server‑side, cached on the row).
- Add sections: **Contact & hours** (phone, website, address with "Get directions" Google Maps link), **Specialties** chips, **About** (already there), **At a glance** stats (recruiting count, total historical trials, phases distribution), **Nearby sites within 25 mi** (uses existing `nearby_sites` RPC), and a **Conditions studied here** list (top 10 conditions from the trials linked to this clinic).
- Extend `getClinicPage` to return these aggregates.

## 6. "Get Matched" quiz (stateless)

New public route `src/routes/get-matched.tsx` — multi‑step wizard, no DB writes:
1. What are you looking to treat? (condition autocomplete against `conditions` table)
2. ZIP code + max travel distance (10 / 25 / 50 / 100 mi)
3. Optional: age, sex, currently recruiting only (default on), phase preference (any/1/2/3/4)
4. Results screen: calls a new public server fn `matchTrialSites({ condition, zip, radius, ... })` which:
   - Geocodes ZIP (zippopotam.us).
   - Runs `nearby_sites` for radius.
   - Joins to `studies` filtered by condition slug + recruiting + filters.
   - Groups by clinic; returns list of `{ clinic, distance_mi, matching_trials: [{nct_id, title, phase}] }` sorted by distance then trial count.
   - Nothing persisted; inputs live only in URL search params / component state.
5. Each result card links to `/clinics/$slug` and lists the matching trials linking to `/studies/$nctId`.

Add a prominent CTA on homepage and `/recruiting` linking to `/get-matched`.

## 7. Automatic study importation

Wire `pg_cron` + `pg_net` to hit the existing `/api/public/cron.import-studies` endpoint (which already exists and is `CRON_SECRET`‑protected):
- Migration: `create extension if not exists pg_cron; create extension if not exists pg_net;`
- Schedule two jobs:
  - Every 6 hours: incremental import of recently‑updated recruiting US studies (batch of ~500).
  - Nightly at 08:00 UTC: `select public.refresh_directory_counts();` and `select public.generate_clinics_from_locations();`
- The `net.http_post` call passes `x-cron-secret` header from a DB `vault`/setting. Because Lovable Cloud users can't set DB vault, we'll store the secret using `alter database ... set app.cron_secret` — or simpler: switch the endpoint to also accept the Supabase `apikey` header (anon key) in addition to `CRON_SECRET`, per platform guidance, and call it with `apikey`. I'll use the `apikey` pattern (documented) to avoid new secrets.
- Add an admin panel widget in `_authenticated/admin.tsx` showing last N `import_runs` rows and a "Run now" button (calls existing server fn).

## Technical notes

- All new/changed server fns use existing patterns (`createServerFn` + `publicClient()` or `requireSupabaseAuth`). Match server fn is public, read‑only.
- Storage: reuse `clinic-images` bucket; add a folder policy allowing authenticated users to `insert` under `claims/<auth.uid()>/*` and admins to `select`.
- New migration includes GRANTs for the added `clinic_claims` columns (table already has grants; column additions inherit).
- No changes to admin auth flow or existing `/auth` route.

## Files touched

- `src/routes/clinics.$slug.tsx` (link + map/profile expansion)
- `src/routes/clinics.auth.tsx` (`next` param)
- `src/routes/clinics.index.tsx` (state filter by slug)
- `src/routes/_authenticated/portal.tsx` (sign‑out)
- `src/routes/_authenticated/portal.claim.tsx` (proof fields + upload + preselect)
- `src/routes/get-matched.tsx` (new)
- `src/routes/index.tsx` (Get Matched CTA)
- `src/lib/directory.functions.ts` (state filter fix, richer `getClinicPage`)
- `src/lib/clinics.functions.ts` (extended claim schema)
- `src/lib/match.functions.ts` (new — `matchTrialSites`)
- Migration: `clinic_claims` new columns; pg_cron/pg_net schedules; storage policy for `clinic-images/claims/*`.
