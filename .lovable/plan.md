
# Clinical Trial & Research Study Directory — v1

Scope: core directory + programmatic SEO pages, admin-only auth, seeded sample (~3k recruiting US studies from ClinicalTrials.gov v2 API). No public user accounts. AI features deferred.

## Stack
- TanStack Start (existing), Tailwind v4, shadcn.
- Lovable Cloud (Supabase) for DB + admin auth.
- Data import via a server function (admin-triggered) hitting ClinicalTrials.gov v2 API.

## Database (Cloud)
Tables (all in `public`, RLS on, anon read for public catalog tables, admin-only writes):
- `studies` — nct_id (pk), title, brief_summary, detailed_description, phase, overall_status, study_type, conditions (text[]), interventions (jsonb), eligibility (jsonb: criteria, min_age, max_age, gender), sponsor_name, collaborators (text[]), start_date, completion_date, last_updated, raw (jsonb), search_tsv (tsvector), slug.
- `locations` — id, nct_id fk, facility, city, state, country, lat, lng.
- `conditions` — slug (pk), name, study_count, overview (nullable).
- `sponsors` — slug (pk), name, study_count.
- `cities` — slug (pk), name, state_slug, study_count.
- `states` — slug (pk), name, abbr, study_count.
- `user_roles` — (user_id, role enum) with `has_role()` security-definer fn.
- `import_runs` — id, started_at, finished_at, inserted, updated, status, error.

Indexes: GIN on `search_tsv`, `studies.conditions`; btree on status, phase, sponsor; composite (state, status), (city, status). Grants per public-schema-grants rules.

RLS:
- `studies`, `locations`, `conditions`, `sponsors`, `cities`, `states`: `SELECT TO anon, authenticated` allowed.
- Writes: only `has_role(auth.uid(),'admin')`.
- `user_roles`, `import_runs`: authenticated read scoped, admin write.

## Auth
- Enable Lovable Cloud. After enable, seed admin user `nokunato@gmail.com` / `Hppavilion1` via `supabaseAdmin` server fn (one-time, idempotent) and insert `('admin')` row in `user_roles`. Password may be rotated later in Cloud → Users.
- No public sign-up UI. `/admin/login` page only.
- `/admin/*` routes live under `src/routes/_authenticated/admin/` with an additional role check (server fn calls `has_role`).

## Routes (file-based)
Public:
- `/` — hero search, featured conditions, browse by state/condition, recently added, popular searches, education teaser.
- `/search` — full filterable search (condition, state, city, status, phase, sponsor, age, gender, study type). URL-driven filters; paginated.
- `/studies/$nctId` — full study detail + JSON-LD `MedicalStudy`/`Article`, breadcrumbs, related studies.
- `/conditions` index, `/conditions/$slug`, `/conditions/$slug/$stateSlug`, `/conditions/$slug/city/$citySlug`.
- `/states` index, `/states/$stateSlug`, `/states/$stateSlug/cities`.
- `/cities/$citySlug`.
- `/sponsors` index, `/sponsors/$slug`, `/sponsors/$slug/$conditionSlug`.
- `/phase/$phase`, `/phase/$phase/$conditionSlug`.
- `/recruiting` — recruiting-only landing.
- `/learn` + `/learn/$slug` — static educational MDX-ish pages (what are clinical trials, phases, eligibility, etc.).
- `/sitemap.xml` (server route, paginated index), `/sitemap-studies-$n.xml`, `/sitemap-conditions.xml`, etc.
- `robots.txt` in `public/`.

Admin (`_authenticated/admin/`):
- `/admin` dashboard — counts, last import run.
- `/admin/import` — trigger sync, view run history/logs.
- `/admin/studies` — table with search, edit/delete.

## SEO
- Per-route `head()` with title/description/canonical/og built from loader data.
- JSON-LD: `MedicalStudy` on study pages, `BreadcrumbList` on deep routes, `FAQPage` on condition/state pages, `WebSite`+`Organization` at root.
- Sitemap index splits at 40k URLs/file; built from DB.
- Internal linking blocks (related conditions, nearby cities, top sponsors) on every aggregate page.

## Data ingestion
- Server fn `runStudyImport({ pageSize=100, maxPages=30, statusFilter='RECRUITING', country='United States' })` calls `https://clinicaltrials.gov/api/v2/studies` with pagination tokens.
- Upserts into `studies` + `locations`, derives slugs, increments aggregate counts at end via SQL refresh.
- Admin-only, logs to `import_runs`.
- Idempotent (upsert by nct_id), versioned by `last_updated`.

## UI/Design
- Clean medical aesthetic: light surfaces, deep teal primary (#0E7C7B-ish), generous whitespace, accessible (WCAG AA). Inter for body, a sturdy display font for headings (loaded via @fontsource).
- shadcn components, mobile-first, sticky search.

## Out of scope (v1)
- AI summaries, eligibility checker, chat assistant (will add later, on-demand).
- User accounts, saved studies, email alerts.
- AACT Postgres sync (API import only for now).

## Technical notes
- Server fns in `src/lib/*.functions.ts`; admin client only via `await import('@/integrations/supabase/client.server')` inside handlers.
- Public reads use server publishable client or browser client.
- `requireSupabaseAuth` middleware + role check for all admin server fns.
- `src/start.ts` must append the bearer attacher middleware.
