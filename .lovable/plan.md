# Fix auto-import + restore the Analytics dashboard

## What's wrong today

**Auto-import is failing silently.** The scheduled job does fire, but the request it sends to the import endpoint comes back `401 Unauthorized` (last attempt: today at 18:00). The reason: the job sends a shared secret it reads from a database setting that was never actually set, so it sends an empty value and the endpoint rejects it. Every import in the history table was started by hand from the admin page — none by the schedule.

**Analytics page is missing.** The `Analytics →` link next to `Sign out` in your screenshot points at a page that no longer exists in the project, so clicking it does nothing / errors. The underlying event data table still exists in the database (244 events recorded: impressions, listing clicks, directions clicks), but nothing in the current app writes to it or reads it.

## What I'll build

### 1. Make the automatic import actually run
- Generate a fresh import secret, store it both as the app secret and as a database setting, so the scheduled job and the endpoint agree.
- Reschedule the import to **every 3 hours with bigger batches** (~1,000 recruiting studies per run, 10 pages x 100).
- Keep the nightly job that regenerates clinics and refreshes directory counts.
- Add a self-check: if a scheduled run fails, it is recorded in the import history with the error, so the admin page shows it.
- Clean up the three stale "running" rows left over from timed-out manual runs, and mark any run stuck over an hour as failed automatically.

### 2. Restore the Analytics page
New admin-only page at `/admin/analytics`, reachable from the `Analytics →` link:
- Headline numbers for the last 7 / 30 days: page views, unique sessions, mobile share.
- Top pages, top conditions, top states/cities, top clinics by impressions.
- Lead activity: eligibility submissions, directions clicks, listing clicks.
- Import health: last successful sync time, studies added in the last 7 days.
- Simple date-range toggle (7d / 30d / 90d), no charting library needed beyond lightweight bars.

### 3. Start collecting events again
- A small tracking helper fires a page-view event on every route change plus click events on study cards, clinic listings and "Get directions", writing to the existing events table.
- No personal data: session id is a random per-browser id, no IP, no form answers.

### 4. Admin page copy fix
Update the "scheduled every 6 hours" text to reflect the new 3-hour cadence and show the last automated run time.

## Technical notes

- Migration: unschedule/reschedule the two `pg_cron` jobs; set `app.cron_secret` via `ALTER DATABASE ... SET`; add an aggregate SQL function for analytics rollups (admin-only, `EXECUTE` granted to `authenticated` behind a role check inside the function, matching the existing hardening pattern); index already present on `occurred_at`.
- Secret rotation for `CRON_SECRET` so the endpoint and the job share one value.
- New files: `src/routes/_authenticated/admin.analytics.tsx`, `src/lib/analytics.functions.ts`, `src/lib/track.ts`.
- Edits: `src/routes/_authenticated/admin.tsx` (Analytics link, cadence copy, last-auto-run), `src/routes/__root.tsx` (page-view tracking).
- Analytics reads run through server functions guarded by `requireSupabaseAuth` + admin role check; the page lives under the existing `_authenticated` gate and stays `noindex`.
