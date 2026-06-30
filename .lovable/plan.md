## Root cause

The `clinics` table (and several other Phase 2/3 tables) were created without `GRANT` statements. Supabase's Data API (PostgREST) does **not** grant default privileges on the `public` schema, so even though the RLS policy *would* let anon read `published = true` clinics, PostgREST blocks the query before RLS ever runs and silently returns 0 rows.

Verified in the database:
- `public.clinics` has 26,709 rows, 26,709 published, 11,534 with `recruiting_count > 0`.
- RLS policy `public read published clinics` exists for `anon, authenticated`.
- `information_schema.role_table_grants` for `public.clinics` returns **zero rows** — no role has any privilege.
- Same problem on `clinic_claims`, `clinic_images`, `lead_delivery_log`, `study_simplifications`, `condition_views`.

That's why:
- `/clinics` shows nothing (anon `SELECT` denied)
- Clinic owners can't see clinics to claim (same query)
- Homepage "Browse by clinic" is empty (`getHomeData.topClinics` uses the same anon read)

## Plan

### 1. Migration: add missing GRANTs

Single migration adding privileges that match each table's existing RLS policies:

```sql
-- Public-readable directory + claim metadata
GRANT SELECT ON public.clinics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinics TO authenticated;
GRANT ALL ON public.clinics TO service_role;

GRANT SELECT ON public.clinic_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_images TO authenticated;
GRANT ALL ON public.clinic_images TO service_role;

-- Auth-only tables (no anon)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_claims TO authenticated;
GRANT ALL ON public.clinic_claims TO service_role;

-- Service-role only (eligibility leads + condition view stats are written by RPC/server fns)
GRANT ALL ON public.lead_delivery_log TO service_role;
GRANT ALL ON public.condition_views TO service_role;

-- AI simplifications: anon read (shown on study pages), service_role writes
GRANT SELECT ON public.study_simplifications TO anon;
GRANT SELECT ON public.study_simplifications TO authenticated;
GRANT ALL ON public.study_simplifications TO service_role;
```

After the migration, `/clinics`, the claim search, and the homepage "Browse by clinic" section will populate immediately — no code changes required for the visibility fix.

### 2. Split clinic auth from admin auth

Current `/auth` doubles as both admin sign-in and clinic-operator sign-up. Per the request, separate them:

- **New route** `src/routes/clinics.auth.tsx` — dedicated clinic operator sign-in / sign-up page. Same Supabase email+password flow; on success redirects to `/portal`. Includes a clear "Are you a clinic running trials?" intro. `noindex`.
- **Trim `src/routes/auth.tsx`** — remove the sign-up tab; admin-only sign-in. Keeps the `seed-admin` ping.
- **Header CTAs** in `src/components/SiteHeader.tsx`:
  - Add a right-aligned pair: `Clinic sign in` (link to `/clinics/auth`) and `Sign up` (link to `/clinics/auth?mode=signup`).
  - When the visitor is already signed in, show `Portal` instead.
  - Keeps the existing "Find a trial" button.

### 3. Verify clinic signups actually succeed

Two things can silently block `supabase.auth.signUp`:
- "Disable new signups" toggled on in Auth settings.
- Email confirmations required but no SMTP wired.

I'll call `supabase--configure_auth` to ensure `disable_signup = false` and `mailer_autoconfirm = true` (so a clinic operator can sign in immediately and submit a claim without waiting on email). The existing `clinic_admin` role is granted only after an admin approves their claim, so auto-confirm doesn't widen access.

### 4. Sanity checks after deploy

- Reload `/clinics` — expect the 26k directory paginated, 60 per page.
- Reload `/` — "Browse by clinic" section renders the top 8 by `recruiting_count`.
- From `/clinics/auth`, create a new account → land on `/portal` → search and submit a claim.
- `/auth` still works for `nokunato@gmail.com` → `/admin`.

## Out of scope this turn

- Stripe billing for premium clinic placement.
- Backfilling `clinics.lat/lng` / hero images beyond what import already populates.
