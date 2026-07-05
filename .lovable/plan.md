## Goal
Make every research-site row on a study page link to a real clinic profile, by (a) tightening the stub-clinic generator so name/whitespace variants still get linked, (b) creating a per-city "unnamed research site" stub for rows where CT.gov didn't provide a facility, and (c) running the updated generator to backfill the ~17k unlinked rows.

## Root cause
`public.generate_clinics_from_locations()` currently:
- Skips rows with NULL/short `facility` → 7,593 sites never get a stub.
- Links by exact equality (`l.facility = c.name AND l.city = c.city AND l.state = c.state`) → whitespace, case, or a slug collision from a sibling facility leaves ~9,370 rows unlinked even after a clinic exists.

## Changes

### 1. Migration — replace `public.generate_clinics_from_locations()`
Keep the signature `RETURNS TABLE(inserted_count int, linked_count int)`; internals:

- Compute a normalized name once (`btrim(regexp_replace(facility, '\s+', ' ', 'g'))`) and use it for both slug and post-insert linking.
- Insert stubs for every unlinked (normalized_name, city, state) group where name length > 2 (unchanged rule, just applied to the normalized value), with `ON CONFLICT (slug) DO NOTHING`.
- Insert **city-level fallback stubs** for unlinked rows with NULL/blank facility: one clinic per (city, state) named `"Research site — {city}, {state}"`, slug `research-site-{city-slug}-{state}`, `published=true`, `claim_status='unclaimed'`. Same ON CONFLICT behavior.
- Link step 1: `UPDATE locations SET clinic_id = c.id FROM clinics c WHERE locations.clinic_id IS NULL AND btrim(regexp_replace(locations.facility, '\s+', ' ', 'g')) = c.name AND lower(locations.city) = lower(c.city) AND locations.state = c.state`.
- Link step 2 (slug fallback for collisions): for still-unlinked rows with a facility, match by the same slug the insert would have produced.
- Link step 3 (city-level fallback): for rows with NULL/blank facility, link to the per-city stub by slug.
- Return `(total_inserted, total_linked)`.

The function stays `SECURITY DEFINER SET search_path = public`, matching the existing security posture.

### 2. Data run (after migration approval)
Run `SELECT * FROM public.generate_clinics_from_locations();` then `SELECT public.refresh_directory_counts();` via the insert tool so the new stubs, links, and clinic recruiting counts are populated for the current dataset. No app code change required beyond this — imports already call both RPCs, so future ingests self-heal.

### 3. No frontend changes needed
`LocationsList` already renders a link whenever `clinic_id` resolves, so once the backfill completes every row will be clickable — including CT.gov entries with no facility name (they'll link to the per-city stub).

## Out of scope
- No fuzzy/trigram matching against pre-existing user-owned clinics — normalized exact match plus slug fallback is enough for the CT.gov feed and avoids linking legit clinics to unrelated CT.gov names.
- No changes to `locations` schema, RLS, or the cron endpoint.
- No changes to clinic-claim flow; new stubs remain `claim_status='unclaimed'` and can be claimed via the existing portal.

## Verification
- `SELECT count(*) FILTER (WHERE clinic_id IS NULL) FROM public.locations;` drops to ~0.
- Open the study the user was viewing (`NCT05822388`) and confirm every research-location row is a link.
- Spot-check a per-city fallback stub page at `/clinics/research-site-<city>-<state>` renders without error.
