## 1. Populate the clinic directory (why /clinics is empty)

The clinic generation job exists (`generate_clinics_from_locations`) but has never been run against the current location set, so `clinics` is empty and `/clinics` shows the "no clinics yet" message.

- Run `generate_clinics_from_locations()` + `refresh_directory_counts()` as a one-shot migration so the directory populates immediately (covers all ~30k+ existing locations).
- Add an explicit "Generate clinics + refresh counts" button on `/admin` that re-runs both, so future imports can backfill on demand.
- Ensure `runStudyImport` always calls both at the tail (it already does — verify and patch if missing).

## 2. Leaflet map widget on study detail page

- New `src/components/TrialMap.client.tsx` (suffix prevents SSR import). Uses `react-leaflet` MapContainer/TileLayer/Marker/Popup with OSM tiles, fits bounds to all pins, popups show facility/city/state/status + link to clinic profile when `clinic_id` is set.
- Load Leaflet CSS via `<link>` in `src/routes/__root.tsx` head (Tailwind v4 rule — no remote `@import`).
- In `src/routes/studies.$nctId.tsx`, dynamic-import the map (`React.lazy` + `Suspense`) inside the "Research Locations" section, fed by the same filtered location list (ZIP + radius + state filter already in place).
- Empty/no-coords fallback: hide the map block when zero locations have `lat`/`lng`.

## 3. Clinic Onboarding Portal UI

Routes under `src/routes/_authenticated/portal.*` (gated by existing `_authenticated` layout; role check inside loaders/components — admin OR clinic_admin):

- `portal.index.tsx` — dashboard: list of clinics the user owns (via `clinic_claims` where `status='approved'`), claim status, recruiting count, plan badge, lead delivery log count.
- `portal.claim.tsx` — search clinics (reuses `listClinics`), submit claim (`submitClaim` server fn → inserts `clinic_claims` row with `status='pending'`).
- `portal.clinic.$id.tsx` — edit profile fields the schema already supports: phone, website, intake_email, description, specialties, hero image (Lovable Cloud `clinic-images` bucket upload).
- `portal.billing.tsx` — placeholder explaining premium placement; "Coming soon" CTA (no Stripe wiring this phase — flagged for next phase to keep scope tight; will request Stripe enablement then).
- Admin: new "Clinic claims queue" section in `/admin` to approve/reject pending claims (sets `clinics.claim_status='approved'`, assigns `clinic_admin` role to the claimant on approval).
- New server fns in `src/lib/clinics.functions.ts`: `submitClaim`, `getMyClinics`, `updateMyClinic`, `uploadClinicImage`, `listPendingClaims` (admin), `decideClaim` (admin).
- `/auth` page: add a "Clinic operator sign up" tab that creates the user and stores intent; role assignment happens on claim approval (no self-grant).
- Header: add "Portal" link visible only when signed in.

## 4. Fix duplicate "Sponsors" link in header

`src/components/SiteHeader.tsx` has two consecutive `<Link to="/sponsors">Sponsors</Link>` entries — remove the duplicate.

## 5. Expand Terms of Service and Privacy Policy

Rewrite `src/routes/legal.terms.tsx` and `src/routes/legal.privacy.tsx` into comprehensive, lawyer-style documents tailored to: **(a) we are an independent informational directory only, (b) we are not a medical provider / not a covered entity / not HIPAA-regulated, (c) we do not store eligibility responses or patient health data — they are forwarded statelessly to the research site, (d) we are not affiliated with ClinicalTrials.gov / NIH / US Government**.

Terms sections: Acceptance, Eligibility/Age (18+), Description of service (directory only, no medical advice, no recommendations), Account terms (admin-only), Intellectual property + ClinicalTrials.gov attribution, Acceptable Use Policy (no scraping abuse, no impersonation, no automated submissions, no use by minors without guardian), Eligibility-tool terms (stateless forwarding, consent to share with research site, accuracy warranty by user, indemnity for false submissions), Third-party sites & sponsors (no endorsement, no responsibility for their conduct, separate privacy practices apply once data is forwarded), Lead delivery & paid placement disclosure (we may receive referral fees, paid placement is labeled), AI-generated content disclaimer (may be inaccurate), No warranties (AS IS / AS AVAILABLE, full disclaimer block), Limitation of liability (cap at $100 or fees paid, exclusion of indirect/consequential damages, applies to AI summaries and lead delivery), Indemnification, DMCA notice & takedown procedure with designated agent contact, Termination, Governing law & venue (Delaware), Arbitration & class-action waiver (AAA, individual basis, 30-day opt-out), Changes to terms, Severability, Entire agreement, Contact.

Privacy sections: Scope (US users, directory service), Controller identity & contact, What we collect (server logs, cookies, aggregate analytics, admin account credentials only — explicitly NOT patient health data, NOT eligibility responses beyond delivery metadata, NOT diagnoses), Eligibility tool data flow (stateless: assembled in-memory → encrypted payload → delivered to research site → discarded; only delivery metadata `{nct_id, timestamp, delivery_status}` retained, no PII retained server-side), Legal bases (legitimate interest for analytics, consent for eligibility submission), How we use info, Sharing & disclosures (research sites for forwarded eligibility submissions only; service providers; legal compliance; business transfers), No sale of personal information (CCPA/CPRA statement), International transfers (US-only service, do not direct to EEA/UK residents), Children (not directed at <18, COPPA), Retention (logs 90 days, delivery metadata 24 months), Security (TLS, hashed admin credentials, least-privilege backend), Cookies (essential only by default, list categories), Analytics (privacy-preserving, no cross-site tracking), HIPAA notice (we are NOT a covered entity or business associate; if you submit PHI you do so voluntarily and outside HIPAA's scope on our end — once delivered to a research site that entity's own privacy practices apply), State privacy rights (CA, VA, CO, CT, UT, TX disclosures + how to exercise; since we don't retain submissions there is typically no record to access/delete), Do Not Track signal handling, Third-party links, Data breach notification commitment, Changes to policy, Contact / DPO email.

Both pages: keep within existing `prose` layout, add a clear "Last updated: June 29, 2026", route metadata, and prominent links from the footer.

6. **"Browse by clinic"** section on the homepage (data from topClinics, sorted by recruiting volume) should show

---

## Technical notes

- New tables: none. Reuses `clinics`, `clinic_claims`, `clinic_images`, `user_roles`.
- New migrations: (a) DO block that runs `generate_clinics_from_locations()` + `refresh_directory_counts()` once.
- New deps: none (`leaflet` + `react-leaflet` already installed).
- Security: keep `clinic_claims` admin-only writes for approval; user can insert their own pending row scoped to `auth.uid()`.
- Out of scope this phase: Stripe billing wiring (placeholder only), AACT sync, SMS lead delivery.

## Order of implementation

1. Populate clinics (migration) + admin button.
2. Header duplicate fix.
3. Leaflet map component + study-detail integration.
4. Clinic portal routes + server fns + admin claim queue.
5. Rewrite Terms + Privacy.