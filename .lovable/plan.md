# Admin Analytics Dashboard (user behaviour on the directory)

The `Analytics →` link in the admin header points to a page that doesn't exist yet, and almost nothing in the app currently records user behaviour (the events table holds 244 old rows from impressions/clicks only). So this comes in two halves: start capturing the behaviour, then build the dashboard on top of it.

## 1. Capture the behaviour (tracking layer)

A lightweight tracker fires events into the existing events table. No personal data: a random per-browser visitor id + per-visit session id, no IP, no form answers, no PHI.

Events captured:
- `search` — every search/filter submit (query text, city, state, condition, phase, status, result count)
- `impression` — study cards, clinic cards and location rows actually rendered in a list (batched, one row per listing per page view)
- `listing_click` — click into a study, clinic profile or research location
- `page_view` — route changes, with city/state/condition/clinic/NCT context and mobile flag
- Lead actions (high intent): `lead_call`, `lead_website`, `lead_directions`, `lead_eligibility`

Each row already supports `session_id`, `path`, `is_mobile`, `city_slug`, `state_slug`, `condition_slug`, `clinic_id`, `nct_id`, `query`, `referrer`, `meta` — plus a new `visitor_id` column so "unique people" is distinct visitors, not distinct sessions.

## 2. The dashboard

Route `/admin/analytics`, admin-only, `noindex`, with a shared time-range picker: Today, Yesterday, 7 days, 30 days, This month, Last month, Custom range. Every tab respects it, and every number shows a change vs the previous equivalent period.

### Overview
- KPI row: Searches, Impressions, Listing clicks, Click rate (clicks ÷ impressions), Lead actions, Unique leads (distinct visitors who took ≥1 lead action), Mobile share.
- Lead actions breakdown: calls, website visits, directions, eligibility checks — count + unique people each.
- Trend chart: impressions / clicks / lead actions over time (hourly for today, daily otherwise).
- Top cities by demand (searches + clicks side by side).
- Top clinics by clicks.
- How users discover listings: entry source (search page, condition page, city/state page, clinic directory, direct/organic referrer).
- Live action feed: the most recent 50 events as readable journey lines ("Visitor from Dallas searched 'diabetes' → viewed Baylor Research → got directions"), auto-refreshing.

### City / State deep dive
- Top cities by impressions; state roll-up table.
- City activity overview: impressions, clicks, CTR, lead actions, unique visitors per city.
- Searched cities — only cities that exist in the directory (matched against the cities table), so junk queries don't pollute it.
- Top cities by lead actions.
- Each row clicks through to a city detail panel: that city's trend, top clinics, top conditions, lead breakdown.

### Clinics deep dive
- Top providers by lead action, top providers by impressions.
- Provider activity table: impressions, clicks, CTR, calls, website, directions, eligibility, unique visitors — sortable, searchable, click-through to a per-clinic detail panel.

### Conditions deep dive
- Top conditions by searches, impressions, clicks, lead actions; CTR per condition; click-through to a per-condition panel showing the cities and clinics that condition converts in.

### User journey explorer
- Sessions list (visitor, device, city, entry page, #steps, whether it ended in a lead action), filterable by "converted only".
- Expanding a session shows the ordered step-by-step path: search terms used, listings seen, listings compared, clinic finally chosen, lead action taken.

## Technical notes

- Migration: add `visitor_id` to `analytics_events` + supporting indexes; add SQL aggregate functions (overview KPIs, breakdown by dimension, time series, session journeys) as `SECURITY DEFINER` with an in-function admin role check, executable by `authenticated` only — matching the hardening already applied to other functions. RLS on the events table stays as-is (anon insert, admin read).
- New files: `src/lib/analytics.functions.ts` (server functions, `requireSupabaseAuth` + admin check), `src/lib/track.ts` (client tracker with batching via `sendBeacon`), `src/routes/_authenticated/admin.analytics.tsx` (tab shell), plus small tab components under `src/components/analytics/`.
- Edits: `src/routes/_authenticated/admin.tsx` (wire the existing Analytics link), `src/routes/__root.tsx` (mount page-view tracking), and the search / study / clinic / locations components to emit search, impression, click and lead-action events.
- Charts use Recharts (already available via shadcn stack) with tokens from the design system — no hardcoded colours.
- All queries aggregate in SQL with time-bucket + limit, so the page stays fast as the events table grows; heavy tables paginate.

## Note on data

Tracking starts collecting from the moment this ships, so the dashboard will look sparse for the first day or two — historical browsing before now was never recorded and can't be backfilled.
