# Finish privacy, SEO, and directory verification

## User-visible result
- Eligibility checks stay in the browser and do not send or save visitor answers or contact details.
- Public visits, searches, and matching do not create new visitor or lead analytics records; existing admin analytics remain available for historical data.
- Recurring imports avoid redundant directory-wide refresh work while study status updates and expired-study cleanup continue.
- Legal copy, crawler files, and page metadata accurately describe the directory and use the public site domain.
- Public search, trial details, eligibility, robots, and sitemap are verified working.

## Work
1. Audit public routes, forms, and server functions for contact collection, lead delivery, or visitor-data writes; remove any remaining public paths.
2. Reconcile privacy and terms copy with the browser-only eligibility flow and removal of clinic accounts/referral leads; keep only statements supported by the actual service.
3. Review recurring import and cleanup jobs; remove redundant full-directory refresh calls from automated and manual import paths while preserving required study updates and deletion behavior.
4. Check existing indexes against the query patterns; add an index only if an observed query needs one.
5. Audit every content route's title, description, social metadata, canonical, and robots behavior; correct the current stale SEO findings and use the public domain in robots/sitemap output.
6. Apply only necessary security dependency updates, then verify the build and exercise home, search, trial detail, eligibility, robots, and sitemap in the preview.
7. Re-read the project roadmap and close completed items; report any blocked item plainly.

## Technical details
- Preserve the existing TanStack Start and Lovable Cloud setup; do not add a service or database table.
- Keep public event ingestion disabled and admin analytics read-only for historical records.
- Avoid schema/data deletion unless required to stop an active public write path.
- Use `https://studyfinder-us.lovable.app` as the canonical public origin; omit sitemap `lastmod` unless its source is page-specific.
