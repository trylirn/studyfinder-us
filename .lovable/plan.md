## Goal
Make each row in the "Research locations" list on a study page clickable, opening the matching clinic profile at `/clinics/$slug` when a clinic is linked to that site.

## Changes

### 1. `src/components/LocationsList.tsx`
- Extend the `Location` type with optional `clinic_id: string | null` and `clinic_slug: string | null`.
- Accept an optional `clinicMap?: Record<string, { slug: string; name: string }>` prop (parent already has this) as an alternative to per-row `clinic_slug`, so callers can pass either shape.
- For each list item, resolve `slug = location.clinic_slug ?? clinicMap?.[location.clinic_id ?? ""]?.slug ?? null`.
  - If `slug` exists: render the row as a TanStack `<Link to="/clinics/$slug" params={{ slug }}>` with hover styles (border/text primary) and an aria-label like `View clinic profile for {facility}`.
  - If no slug: keep the current non-interactive `<li>` (many CT.gov sites don't have a corresponding clinic in our DB).
- Keep existing filter/search UI and the `slice(0, 60)` cap unchanged.
- Add a small "View profile →" affordance on linked rows so users can tell which are clickable.

### 2. `src/routes/studies.$nctId.tsx`
- Pass `clinicMap` down: `<LocationsList locations={locations} clinicMap={clinicMap} />`. No other changes.

## Out of scope
- No schema changes, no new server function, no changes to how locations/clinics are joined (already done in `getStudy`).
- Map pins already link to clinics; no changes there.
- No changes to filters, pagination, or the eligibility/CTA sections.

## Verification
- Load a study whose locations include one of our clinics; confirm that row is a link, hover state works, and clicking navigates to `/clinics/<slug>`.
- Load a study with only unmatched CT.gov sites; confirm rows render as before (non-clickable) with no console errors.
