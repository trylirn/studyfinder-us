## Goal
1. Finish the previously approved fix: replace `generate_clinics_from_locations()` and backfill so every research-site row links to a clinic profile.
2. Merge duplicate clinics that share the **same address** and have **near-identical names**, so slight naming variants (e.g. "Georgia Lung Associates" and "Georgia Lung Associates, PC"; "Kaiser Permanente - Deer Valley" and "Kaiser Permanente-Deer Valley Medical Center") collapse into a single profile.

## Merge rules (both conditions must hold)

**"Same address"** — either of:
- Same `zip` (non-null) and same `state`, or
- Same rounded `(lat, lng)` to 3 decimals (~110 m) and same `state`.

Rows with only a shared city+state but no zip/coords are NOT merged (too many false positives — same city can hold dozens of unrelated real clinics).

**"Similar name"** — after normalization (lowercase, strip punctuation, strip trailing legal suffixes `inc|llc|pc|pa|pllc|corp|ltd`, collapse whitespace) one of:
- Normalized names are equal, or
- One normalized name is a prefix or contains the other (min 8 chars overlap), or
- `similarity(a, b) >= 0.72` via `pg_trgm` (already enabled).

**Exclusions** — never merge a clinic that:
- has `claimed_by IS NOT NULL` into another clinic (claimed profiles are authoritative);
- has a different `claimed_by` than its candidate canonical;
- is the per-city `research-site-…` stub introduced in step 1 (those are city-level catch-alls, not real clinics).

**Canonical winner within a group:**
1. `claimed_by IS NOT NULL` wins.
2. Else the row with the most `locations` currently linked.
3. Else shortest normalized name (prefix winner).
4. Tie-break: oldest `created_at`, then smallest `id`.

**Merge action** (one transaction per group):
- Reassign `locations.clinic_id`, `clinic_claims.clinic_id`, `clinic_images.clinic_id`, `lead_delivery_log.clinic_id` from each duplicate → canonical.
- Backfill NULL fields on canonical from duplicates: `zip, lat, lng, phone, website, description, npi` (only when canonical is NULL).
- `DELETE` the duplicate `clinics` rows.
- Call `refresh_directory_counts()` at the end.

## Deliverables

### 1. Migration — replace `public.generate_clinics_from_locations()`
(Same body as the previously approved plan: normalize facility name for slug + link, add per-city fallback stubs for NULL-facility sites, add slug-fallback link step.)

### 2. Migration — new one-shot function `public.merge_duplicate_clinics()`
`SECURITY DEFINER SET search_path = public`, returns `TABLE(groups_merged int, clinics_removed int)`.
Body implements the rules above with a single CTE that:
- Groups candidate clinics by `(state, coalesce(zip, round(lat,3)::text||','||round(lng,3)::text))`.
- Within each group, builds pairs where normalized-name equality / prefix / trigram similarity ≥ 0.72 holds.
- Uses a union-find via `WITH RECURSIVE` to form transitive clusters, then picks the canonical row per cluster and executes the reassign/backfill/delete.

Also add an idempotent guard: after the run, any newly linked `locations` that still don't have `clinic_id` stay untouched.

### 3. Data run (via insert tool, after migration approval)
```sql
SELECT * FROM public.generate_clinics_from_locations();
SELECT * FROM public.merge_duplicate_clinics();
SELECT public.refresh_directory_counts();
```

### 4. No frontend changes
Rows already link via `clinic_id`; existing routes handle the survivor slug. TanStack Query cache reloads on next fetch — nothing to invalidate manually.

## Safety / reversibility
- Ships as a callable function, not an inline one-shot migration DML, so it can be re-run.
- Dry-run preview available via `psql` before the destructive step: I'll `SELECT ... EXPLAIN`-style query the cluster preview and report counts (groups + rows-to-delete) to you before invoking the function.
- Because we reassign FKs before delete, no `locations` will end up with a stale `clinic_id`.
- Not merged in this pass: cross-city name matches, and any row without zip/coords.

## Verification
- `SELECT count(*) FROM public.clinics;` before/after — expect a meaningful drop.
- `SELECT count(*) FILTER (WHERE clinic_id IS NULL) FROM public.locations;` ≈ 0.
- Load `NCT05822388` — every research-site row links, and same-address variants share one profile URL.
- Spot-check a merged clinic's page shows the aggregated study count.

## Out of scope
- Fuzzy cross-city merging (e.g. campus branches in adjacent cities).
- Manual admin merge UI — can add later if needed.
- Merging user-owned clinics with different claimants.
