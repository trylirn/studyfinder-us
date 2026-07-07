Three independent workstreams, all shippable in one build pass.

## 1. Trial contact info from ClinicalTrials.gov

**Schema** (migration):
- `studies`: add `central_contacts jsonb NOT NULL DEFAULT '[]'`, `overall_officials jsonb NOT NULL DEFAULT '[]'`.
- `locations`: add `contacts jsonb NOT NULL DEFAULT '[]'` (per-site contact array).

**Importer** (`src/lib/import.functions.ts`):
- Extend `contactsLocationsModule` type with `centralContacts[]`, `overallOfficials[]`, and per-location `contacts[]` (name, role, phone, phoneExt, email).
- Map into new columns during upsert. Backfill on next scheduled/manual import.

**Study page** (`src/routes/studies.$nctId.tsx`):
- New "Contact the study team" section under the header when `overall_status = RECRUITING`:
  - Central contacts: name, role, phone (`tel:` link), email (`mailto:` link).
  - Overall officials: name, role, affiliation (no phone typically).
  - Fallback text if none present: "Contact information not provided by sponsor. Use the location list below."
- `LocationsList`: per-site expandable "Site contact" showing that location's contacts.

## 2. Rework "Check my eligibility" — no PII / no lead capture

Replace `EligibilityModal.tsx` with a stateless self-screener:
- Steps: (1) demographics (age, sex), (2) study-specific structured questions parsed from `eligibility.criteria`, (3) result screen.
- **Question generator** (`src/lib/eligibility-parser.ts`, pure client util):
  - Split criteria text into Inclusion / Exclusion bullets.
  - Emit yes/no questions per bullet: "Inclusion: {text} — Does this apply to you?" / "Exclusion: {text} — Does this apply to you?".
  - Cap at ~12 questions; show a "view full criteria" details block for the rest.
- **Scoring** (client only, nothing sent to server):
  - Fail if age out of range, sex mismatch, any inclusion answered "No", any exclusion answered "Yes", or status ≠ RECRUITING.
  - Otherwise "You may be eligible" + guidance to contact the study team (deep-link to the new contact section on same page).
- Remove: name/email/phone/zip inputs, consent checkbox, lead-delivery flow, `submitEligibilityLead` server fn.
- Retire (do not delete tables) `lead_delivery_log` writes from the eligibility path; server fn file removed.
- Add a small "Your answers stay on this device — nothing is submitted or stored" notice.

## 3. Admin analytics dashboard

**Event capture** (new table + policies migration):
- `public.analytics_events`:
  - `id bigserial pk`, `occurred_at timestamptz default now()`,
  - `event_type text` (`search`, `impression`, `listing_click`, `lead_call`, `lead_website`, `lead_directions`, `lead_eligibility`),
  - `session_id uuid`, `path text`, `is_mobile bool`,
  - `city_slug text`, `state_slug text`, `condition_slug text`, `clinic_id uuid`, `nct_id text`,
  - `query text`, `referrer text`, `meta jsonb default '{}'`.
- Indexes on `(occurred_at desc)`, `(event_type, occurred_at)`, `(city_slug)`, `(clinic_id)`, `(condition_slug)`, `(session_id)`.
- RLS: `INSERT` allowed for `anon`+`authenticated` (rate-limit via app), `SELECT` only via admin server fns using `has_role`. GRANT INSERT to anon/authenticated, SELECT to service_role.

**Client tracker** (`src/lib/analytics.ts` + `src/lib/analytics.functions.ts`):
- `track(event)` batches events, POSTs to `logAnalyticsEvent` server fn (publishable-key insert).
- Persistent `session_id` in `localStorage` (uuid, no PII). Detect mobile via UA + viewport.
- Wire calls:
  - `search` on search-bar submit and filter changes (state/city/condition/phase).
  - `impression` on StudyCard/ClinicCard mount via IntersectionObserver.
  - `listing_click` on StudyCard/ClinicCard click.
  - `lead_call` on `tel:` click, `lead_website` on website outbound, `lead_directions` on map "directions" click, `lead_eligibility` on eligibility modal open.

**Admin routes** (all under `_authenticated/admin.*`, gated by `has_role(admin)` in server fns):
- `_authenticated/admin.analytics.tsx` — Overview (tab bar for sub-pages).
- `_authenticated/admin.analytics.cities.tsx` — City/state deep dive with drill-in.
- `_authenticated/admin.analytics.cities.$slug.tsx` — Per-city detail.
- `_authenticated/admin.analytics.clinics.tsx` — Clinics deep dive.
- `_authenticated/admin.analytics.conditions.tsx` — Conditions deep dive.
- `_authenticated/admin.analytics.journeys.tsx` — User journey explorer.
- Shared `AnalyticsRangePicker` component: Today, Yesterday, 7d, 30d, This month, Last month, Custom (2 date inputs). Range persisted in URL search params.

**Server aggregations** (`src/lib/analytics.functions.ts`, all `.middleware([requireSupabaseAuth])` + admin role check):
- `getOverview({from,to})`: totals for searches, impressions, listing clicks, lead actions (by type), unique sessions with ≥1 lead action, CTR (clicks/impressions), mobile share, top 10 cities by searches+clicks, top 10 clinics by clicks, discovery breakdown (referrer host / internal path), lead action mix, live feed (latest 20 events).
- `getCitiesAnalytics({from,to})`: top cities by impressions, by searches, by lead actions; activity table (searches, impressions, clicks, leads per city).
- `getCityDetail({slug,from,to})`: same metrics scoped to one city + top clinics in that city.
- `getClinicsAnalytics({from,to})`: top clinics by leads, by impressions, activity table.
- `getConditionsAnalytics({from,to})`: top conditions by searches, impressions, leads.
- `getJourneys({from,to,limit})`: group last N events by `session_id`, ordered timeline per session (search → impressions → click → lead action).
- Live feed via TanStack Query `refetchInterval: 15s` (no realtime channel needed; keeps costs down).

**UI**:
- Cards + tables using existing shadcn primitives; simple bar lists (no chart lib needed for v1). If a chart is required, use `recharts` (already common); confirm during build if not installed.
- Range picker in header of every analytics page; drill-in links preserve range.

**Add nav link** from `admin.tsx` header → Analytics.

## Verification
- Import 1 page, spot-check `studies.central_contacts` and `locations.contacts` populated.
- Open a recruiting study → contact section renders with `tel:`/`mailto:`.
- Open Check eligibility → no PII fields, questions derived from criteria, pass/fail correct.
- Browse directory pages while signed in as admin → `analytics_events` rows appear; admin analytics pages render numbers > 0 across ranges.
- All new server fns require admin; anonymous access returns 401/403.

## Out of scope
- Historical backfill of analytics before this ships.
- Charting library beyond what already exists (bar lists first; recharts if needed).
- Merging/deduping contacts across sites.
