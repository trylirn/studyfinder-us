# Analytics fix, clinic-portal removal, richer imports

## 1. Fix the analytics error

The "Cities & states" breakdown query references a `state` column on the cities table, but cities only stores `state_slug`. Every Overview load fails with `column ci.state does not exist`.

Fix: update the `analytics_breakdown` database function to join through `state_slug` to the states table and use the state name/abbreviation for labels. Verified against the current function source.

## 2. Analytics UI on shadcn/ui + Recharts

Audit the analytics dashboard and its shared pieces (KPI tiles, breakdown panels, journeys feed) and make sure every surface is built with shadcn Card/Table/Tabs/Badge/Select primitives and Recharts charts (the shadcn chart wrapper with themed tokens) — no raw HTML tables, ad-hoc bars, or hardcoded colors. Keep the existing time-range control and tabs.

## 3. Remove clinic claiming and clinic auth

- Delete the clinic sign-in/sign-up route, the claim form/route, and the "Clinic portal" and "Claim this clinic" / "Unclaimed profile" entry points in the header and clinic profile pages.
- Remove clinic-portal dashboard routes and the clinic-operator tab from auth. Admin sign-in stays.
- Clinic profiles remain fully public and read-only, managed by admin only.
- Database tables (`clinic_claims`) are left in place but unused; no data loss. Storage/claim review UI in the admin panel is removed along with it.

## 4. Import automation every 2 hours

Reschedule the pg_cron import job to `0 */2 * * *` (every 2 hours, every day), keeping the existing secret-authenticated endpoint. Verify the job is registered and its last runs succeed.

## 5. Contact information on every import

ClinicalTrials.gov returns central contacts, overall officials, and per-location contacts. The importer currently keeps only location addresses and drops all contact data, so the columns that exist for it stay empty.

Fix: map from the contacts/locations module on each import:
- study-level central contacts (name, role, phone, phone ext, email) and overall officials
- per-location contacts stored on each location row

Then surface them on the trial detail page: a "Study contacts" block (name, phone, email as safe mailto/tel links) and contact lines inside each research-location row, mirroring the ClinicalTrials.gov layout in the reference screenshot. A backfill re-import will refill existing records over the next automated runs; an admin-triggered full refresh can be run once to speed it up.

## Technical notes

- One migration for the `analytics_breakdown` fix; one insert-style SQL statement for the cron reschedule.
- Importer changes in `src/lib/import.functions.ts` (fetch fields already include `contactsLocationsModule`), writing to existing `studies.central_contacts`, `studies.overall_officials`, and `locations.contacts` columns.
- Route deletions: clinic auth, claim, and portal routes plus their nav links.
