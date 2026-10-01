# Finish privacy, scheduling, and SEO cleanup

## User-visible result
- The eligibility checker will stay entirely in the browser: no name, email, phone, consent-to-contact, delivery, or visitor answer storage.
- Public browsing and matching will not create visitor IDs, sessions, lead events, or analytics rows.
- Automated imports will continue, but the redundant heavy directory-count and clinic-generation calls will be removed from recurring jobs.
- Robots and sitemap URLs will always use the public `studyfinder-us.lovable.app` domain.
- The site will include a favicon and preserve the existing SEO metadata on public pages.

## Work
1. Replace the eligibility submission flow with local-only age, gender, ZIP, status, and nearby-site matching.
2. Remove public tracking writes and tracking calls while keeping existing admin analytics read-only and available for historical data.
3. Remove redundant scheduled refresh RPC calls and add only a justified study recency index if the current schema needs it.
4. Correct robots.txt and sitemap host generation, add the favicon, and update privacy/legal copy so it no longer promises contact delivery.
5. Run a fresh SEO foundations scan, verify the build, and exercise public home, search, study detail, eligibility, robots, and sitemap flows.

## Technical details
- Use existing TanStack Start routes and browser state; do not add a new service or database table.
- Keep terminal-study deletion and status updates in the automated status refresh.
- Keep admin analytics queries intact; make the public event ingestion path a no-op.
- Use a public-domain absolute host in generated robots and sitemap content.
