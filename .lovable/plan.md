
# v2 — Lead-Gen, Geo, AI, and Clinic Portal

Builds on the existing TrialFinderUS v1. Grouped by area; each item is scoped so it can ship independently.

## 1. Trial detail page restructure
- New header layout:
  - Trial title + NCT ID + status/phase badges.
  - Prominent high-contrast **"Check My Eligibility"** CTA directly under the title.
  - Two clearly separated blocks: **Sponsor** (funding institution, links to sponsor page) vs **Research Sites** (physical clinics).
- New **Research Locations** section:
  - Lists facility name, city, state, status.
  - Built-in location search bar: filter sites by State dropdown or ZIP + radius (default 50 mi).
  - Only matching sites render when a filter is active; "X of Y sites match" counter + "Clear" button.
  - Each site links to its Clinic Profile (item 4) when one exists.

## 2. Eligibility Checker funnel (stateless, pay-per-lead ready)
- Modal wizard launched from the CTA on every trial page.
- Steps:
  1. Age + Gender.
  2. Diagnosis confirmation — questions auto-generated from the trial's `conditions` + parsed eligibility criteria (yes/no checkboxes; "have you had chemo?" style).
  3. ZIP code (used to pick nearest research site).
  4. Contact info: name, email, phone + explicit consent checkbox.
- Logic:
  - All state lives in React component memory only — never persisted, never written to DB.
  - On submit, a server function evaluates pass/fail against the trial's criteria flags.
  - On pass: builds an encrypted JSON payload, sends to the clinic's intake email (Resend connector) and/or webhook URL stored on the clinic profile, then returns success. No row inserted; no logs of PHI.
  - On fail: friendly "not a match" screen with up to 3 related trials.
- Lead packet shape (encrypted in transit, plaintext in the destination email body):
  - Contact: name, email, phone.
  - Pre-screening: age, ZIP, nearest site, list of confirmed criteria strings, trial NCT ID.
- Legal: in-modal consent text + HIPAA-style disclaimer; nothing stored server-side.

## 3. Map View for locations
- New `<TrialMap>` component using Leaflet + OpenStreetMap tiles (no API key required).
- Used in two places:
  - Trial detail page: pins for every research site, ZIP + radius search overlay.
  - `/search`: optional "Map" toggle — pins for sites of currently filtered trials.
- Geocoding: backfill lat/lng for `locations` rows that have them from ClinicalTrials.gov v2 API; cache to DB. For ZIP→lat/lng we ship a small bundled US ZIP centroid dataset (zip → lat,lng) so radius math is offline and free.
- Radius filter: haversine distance done in SQL via a server function (`nearby_sites(zip, radius_mi, nct_id?)`).

## 4. AI Protocol Simplifier
- "Simplify with AI" button on trial detail page (next to Brief Summary and Eligibility blocks).
- Server function calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with a 5th-grade reading-level prompt.
- Results cached per `nct_id` + section in a new `study_simplifications` table to avoid re-billing for repeated views.
- Renders inline below the original text with a "Show original" toggle + "AI-generated, not medical advice" caption.

## 5. Clinic Profiles + Sponsor/Site Onboarding Portal
- New `clinics` table: name, slug, specialties[], address, city, state, zip, lat/lng, phone, website, hero_image, gallery[], intake_email, intake_webhook_url, claimed_by (user_id, nullable), plan ('free'|'featured'|'premium'), featured_until.
- New `clinic_trials` view/materialization: list of active trials at each clinic (joins via locations.facility ≈ clinics.name + city/state, plus manual overrides).
- Public route `/clinics/$slug`: specialties, address, map pin, photo gallery, equipment list, active recruiting trials at this site.
- Onboarding portal under `/_authenticated/portal/`:
  - Sign-up flow for clinic operators (new `clinic_admin` role in `app_role` enum).
  - "Claim your clinic" search → submit verification (manual approval by admin in v2).
  - Dashboard: edit profile, upload images (Lovable Cloud storage), set intake email/webhook, manually update "active recruiting count" overrides, view incoming lead delivery log (delivery metadata only — no PHI).
  - Premium placement: Stripe checkout (Stripe connector) for `featured` (highlighted on city/condition pages) and `premium` (top-of-results badge + dedicated CTA). Stored as `plan` + `featured_until`; no payment data in our DB.

## 6. Dynamic "Popular" tags
- Replace hard-coded condition tags on the homepage and headers.
- New server function `getTrendingConditions()` ranks conditions by:
  `score = recruiting_study_count * 0.6 + clinics_offering * 0.3 + recent_views * 0.1`
  where `recent_views` comes from a lightweight `condition_views` counter (incremented from condition pages, no PII).
- Cached for 1 hour in-memory per server instance.

## 7. UI / data quality cleanup
- Hide phase badge when phase is `NA`, `null`, or `"Not Applicable"` — show study type instead.
- Filter out study cards missing both `brief_summary` and `phase` from listing pages (still reachable via direct URL).
- Normalize `overall_status` display; drop cards with `WITHDRAWN`/`TERMINATED` from default lists (toggle to include).

## 8. Expanded legal disclaimer
- New `<LegalDisclaimer>` component used in footer + before every Eligibility CTA.
- Content covers: not medical advice; no doctor-patient relationship; no treatment recommendations; informational only; consult licensed physician; not affiliated with ClinicalTrials.gov; site may earn fees from clinics for verified referrals; user consents to share submitted info with the selected clinic.
- Dedicated `/legal/disclaimer`, `/legal/privacy`, `/legal/terms` pages with full text; footer links updated.

---

## Technical details

### New tables (all with GRANTs + RLS per project rules)
- `clinics` — public SELECT to anon for claimed/published; write only by `clinic_admin` owning the row or `admin`.
- `clinic_images` — storage metadata; same RLS as parent clinic.
- `study_simplifications(nct_id, section, model, text, created_at)` — public SELECT, admin write (server function uses service role).
- `condition_views(condition_slug, day, count)` — public SELECT aggregated, server-function increment via RPC.
- `lead_delivery_log(id, clinic_id, nct_id, delivered_at, channel, status)` — **no PHI**, just delivery metadata; visible to the owning clinic admin.
- Add `lat`, `lng` columns to existing `locations` (backfill task in admin import).
- Extend `app_role` enum with `clinic_admin`.

### Server functions (`src/lib/*.functions.ts`)
- `submitEligibilityLead` — stateless evaluator + emailer; never writes lead data.
- `simplifyStudyText({ nctId, section })` — Lovable AI call, upserts cache row.
- `nearbySites({ zip, radiusMi, nctId? })` — haversine SQL.
- `getTrendingConditions()` — scoring + cache.
- Portal CRUD: `getMyClinic`, `updateMyClinic`, `uploadClinicImage`, `setClinicIntake`, `startPremiumCheckout` (Stripe).

### New routes
- `/clinics/index`, `/clinics/$slug`.
- `/_authenticated/portal/index`, `/portal/clinic`, `/portal/leads`, `/portal/billing`.
- `/legal/disclaimer`, `/legal/privacy`, `/legal/terms`.
- `/api/public/stripe-webhook` (premium plan upgrades).

### Integrations to enable
- **Resend** (lead delivery email) — via connector.
- **Stripe** (premium placement) — via connector.
- **Leaflet + OSM** — npm `leaflet` + `react-leaflet`, no key.

### Out of scope for this iteration
- Automated clinic verification (manual admin approval in v2).
- SMS lead delivery (email + webhook only).
- Multi-language simplification.

Approve and I'll implement in this order: schema → trial-detail restructure + eligibility modal → map + radius → AI simplifier → clinic profiles + portal → trending tags + UI polish → legal pages.
