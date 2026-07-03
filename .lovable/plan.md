## 1. Fix the "permission denied for function nearby_sites" error (from screenshot)

Root cause: last turn's security lockdown revoked EXECUTE on `nearby_sites` from `anon`/`authenticated`, but `matchTrialSites` calls it via the anon publishable client. Restore EXECUTE for `anon` and `authenticated` (function is `SECURITY DEFINER` and only reads already-public `locations` rows — safe to expose).

Migration:
```sql
GRANT EXECUTE ON FUNCTION public.nearby_sites(double precision, double precision, double precision, text)
  TO anon, authenticated;
```

## 2. Make the Get Matched quiz smarter and more accurate

**New questions** (all optional except condition + ZIP):
1. Condition (existing, keep autocomplete)
2. Location: ZIP + max distance (existing)
3. **About you** (new step): age, sex assigned at birth, whether you have a diagnosis today, general health status
4. **Trial preferences** (existing step + additions): phase, recruiting-only, study type (interventional/observational), accepts healthy volunteers, willing to receive placebo, paid studies only

**Better matching in `src/lib/match.functions.ts`**:
- Broaden the study query: match on `condition_slugs.contains([slug])` OR `search_tsv @@ plainto_tsquery(conditionName)` so misspellings/synonyms still find studies.
- Apply age/gender client-provided values to `min_age_years` / `max_age_years` / `gender` filters (`gender IN ('ALL', <sex>)` and `min_age_years <= age AND (max_age_years IS NULL OR max_age_years >= age)`).
- Study-type filter (`INTERVENTIONAL` / `OBSERVATIONAL`).
- Rank results by: distance, then trial_count, then whether clinic is currently recruiting.
- Return `matched_count` vs `total_nearby` so the UI can show a helpful message ("42 sites within 25 mi, 6 match your criteria").
- If zero results, return the closest 5 sites regardless of filters as a "nearest sites" fallback list, clearly labeled.

**Nothing is persisted** — all inputs stay in React state; no DB writes, no logs.

## 3. Prominent disclaimer on the quiz

Add before Step 1 and again above the results:
> This tool provides general information only and is not medical advice, diagnosis, or a referral. Eligibility is determined by the trial's research team, not by us. Talk to your doctor before enrolling in any clinical trial. We do not store your answers.

Reuses the existing `<LegalDisclaimer />` component in a compact variant, plus a link to `/legal/disclaimer`.

## 4. Admin polish — recent imports widget + claim proof review

Current admin page already lists recent runs but is basic. Improvements:

- **Recent imports widget**: show last 10 runs with started/finished timestamps, status badge (running/completed/failed), page count, and any error message truncated. Add a small "auto-import status" line noting the pg_cron schedule.
- **Claim review with proof docs**: extend `listPendingClaims` to also return `role`, `relationship`, `npi`, `work_website`, `proof_paths`. In the admin claim row:
  - Show role/relationship/NPI/website inline.
  - For each `proof_paths[]` entry, generate a signed URL (server-side, 5-minute expiry) via a new `getClaimProofUrls` server function using `supabaseAdmin` (bucket is private).
  - Render as clickable links "Proof 1 · Proof 2…" with filename.
  - Admin can preview before approve/reject.

## 5. Verification

After changes:
- Load `/get-matched`, complete the flow with Diabetes Mellitus / 77030 / 25 mi → confirm results render and no permission error.
- Load `/admin` → confirm recent-runs list and claim proof links open signed URLs.

### Technical details

- **Files touched**
  - Migration: grant EXECUTE on `nearby_sites`.
  - `src/lib/match.functions.ts`: extend input schema (age, sex, studyType, healthyVolunteers, placebo, paidOnly), broaden study query, apply eligibility filters, add fallback list, return richer counts.
  - `src/routes/get-matched.tsx`: 5-step wizard (condition → location → about you → preferences → results), disclaimer banner, richer results UI.
  - `src/lib/clinics.functions.ts`: extend `listPendingClaims` select columns; add `getClaimProofUrls` server function (admin-only, uses `supabaseAdmin.storage.from('clinic-images').createSignedUrls`).
  - `src/routes/_authenticated/admin.tsx`: richer runs list, richer claim rows with proof links.

- **Non-goals**: no schema changes beyond the GRANT; no new tables; no persistence of quiz answers.