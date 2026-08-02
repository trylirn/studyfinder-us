# Live Directory Analytics and Automatic Study Imports

## Goal

Start populating the admin analytics dashboard from real directory behavior and make ClinicalTrials.gov synchronization run unattended without requiring an admin login.

## 1. Activate privacy-preserving behavior tracking

- Mount one global tracking lifecycle in the root route:
  - initialize and flush the existing queue safely;
  - emit one `page_view` after each completed route/search change;
  - clear impression deduplication between page views;
  - derive route context such as city, state, condition, clinic, and NCT ID where available.
- Emit `search` when the shared search form is submitted, including the normalized query and source page. Do not record eligibility answers, contact information, or other form data.
- Make study cards report:
  - one deduplicated `impression` when rendered for the current page;
  - `listing_click` when opened;
  - NCT ID plus source/context so search, clinic, and programmatic directory pages can be compared.
- Track clinic-profile lead actions at the moment the visitor clicks:
  - phone number → `lead_call`;
  - provider website → `lead_website`;
  - directions → `lead_directions`;
  - include clinic ID and its city/state context.
- Track `lead_eligibility` only after a successful eligibility submission, not when the modal merely opens, so “lead actions” reflects actual high-intent completion. Include the NCT ID and safe condition context only; never include answers, ZIP, name, email, or phone in analytics.

## 2. Repair unattended ClinicalTrials.gov synchronization

- Keep the secured public cron route and configure one generated shared secret in both the application environment and the database scheduler; do not expose it in source, migrations, URLs, logs, or the browser.
- Replace the current six-hour job, whose HTTP requests are confirmed to return `401`, with a matching authenticated job against the stable production endpoint.
- Preserve the current six-hour incremental recruiting-study sync and nightly clinic/count refresh. Keep the admin buttons as optional manual recovery controls, not a requirement for routine updates.
- Consolidate the duplicated import parsing/upsert logic behind a server-only helper shared by the admin function and cron route, so automated and manual imports cannot drift in fields or behavior.
- Ensure every accepted scheduled request creates and completes an `import_runs` record, including clear error status when the upstream API or database step fails.
- Update the admin import panel to show the actual automation status and latest successful automated run rather than merely claiming a schedule exists.

## 3. Validate end to end

- Verify public navigation emits page views, searches, impressions, listing clicks, and each lead type without affecting navigation or opening external links.
- Confirm duplicate impressions are suppressed only within the same page view and new route/page views can record fresh impressions.
- Invoke the secured import endpoint through the scheduler-compatible path, confirm a non-401 response, and verify a completed automated `import_runs` row.
- Check the admin analytics range views and live journey feed against newly emitted events, including distinct-visitor lead counting.
- Verify the homepage, search, study detail, clinic profile, admin dashboard, and analytics route at desktop and mobile widths; check browser console/network output for regressions, including the currently reported dynamic-module loading error.

## Technical notes

- Tracking remains first-party and anonymous: random visitor/session UUIDs only, with no IP handling or PHI/form-answer capture.
- Analytics failures remain non-blocking and must never interrupt directory actions.
- The scheduled endpoint remains protected by a server-side secret; no anonymous-key bypass or public write capability will be introduced.
- Existing admin authentication and authorization stay unchanged.