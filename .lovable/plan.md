# Fix automated imports + handle expired trials

## What I found (verified)

The schedule is running, but every call is rejected:

- The job `trialfinder-import-studies-2h` fires on time (last runs 00:00, 02:00, 04:00, 06:00, 08:00, 10:00 UTC today).
- Every HTTP response is `401 {"ok":false,"error":"Unauthorized"}` (one `502` at 06:00).
- Reason: the job reads the shared secret under the name `cron_secret`, but the only stored secret is named `study_import_cron`. So the job sends an empty secret header and the endpoint correctly refuses it.
- Result: the last successful import row is from Aug 2, 16:08 — which is why the admin dashboard shows no new runs and the numbers never move.

## Fix 1 — make the schedule actually authenticate

Recreate the every-2-hours job so it reads the secret under the name that actually exists, then trigger one run immediately and confirm a new completed import row plus a `200` response. If the run still fails, fall back to the secret stored in the app environment and align both.

Also bump the batch back to a meaningful size (5 pages x 100 studies) so each run refreshes real volume instead of 10 records.

## Fix 2 — surface automation status in the admin dashboard

The dashboard currently just lists import rows. Add a small automation panel showing:

- next scheduled run and cadence,
- last automated run: time, status, inserted/updated counts,
- a clear warning banner when the last automated run failed or is older than ~6 hours.

That way a silent failure like this one is visible without asking.

## Fix 3 — expired / closed trials

Today the sync only pulls studies currently marked RECRUITING. A trial that closes simply stops appearing in the feed, so its record stays frozen as "Recruiting" in the directory forever. That's the bigger accuracy risk.

Plan:

- Add a second scheduled pass ("status refresh") that re-checks studies already in the database whose records haven't been updated recently, pulling their current status from ClinicalTrials.gov regardless of status, and writing back status, completion date, and last-update date.
- Keep closed studies in the database (they're valuable SEO pages and legitimate history) but treat them as non-recruiting everywhere: excluded from recruiting counts, city/state/condition/clinic recruiting totals, and the matching quiz.
- Show a clear status banner on a study page when it is no longer recruiting (Completed / Terminated / Withdrawn / Suspended), with the closure date and a link back to still-recruiting trials for the same condition, instead of a live eligibility CTA.
- Withdrawn and terminated studies stay out of the sitemap and directory counts, as they already are.

## Technical notes

- Cron changes go through an insert-style SQL statement (secret values must not live in migrations); the endpoint itself needs no code change for Fix 1.
- Status refresh reuses the shared importer helper, adding a query mode that fetches by NCT ID batches with no status filter, ordered by oldest `updated_at`.
- Recruiting-count logic already lives in `refresh_directory_counts()`; it will be extended to key off status rather than assuming presence means recruiting.
- Study-page status banner is presentation-only in `src/routes/studies.$nctId.tsx`.
