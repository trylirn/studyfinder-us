# Finish directory performance, blog publishing, privacy, and SEO

## Work
1. Resolve the reported TypeScript/build errors in the blog data and detail-page code; preserve the existing published-only read behavior and server-only publishing writes.
2. Make the conditions, states, sponsors, clinics, and recruiting pages render their initial results from route-prefetched queries. Normalize query keys to primitive filter values, share the states query where appropriate, and fix recruiting's blank-until-refresh behavior without adding indexes unless query evidence justifies them.
3. Complete blog discovery and publishing: link `/blog` from site navigation/footer, include published blog entries in the sitemap, verify the existing public endpoint's timing-safe bearer check, payload validation, and source-id upsert, and ensure post SEO metadata is emitted on `/blog/$slug`.
4. Finish the outstanding privacy and SEO cleanup: confirm no visitor contact details or identifying browsing data are persisted, remove stale legal copy and redundant scheduled count-refresh work, review every public content page against Google's SEO Starter Guide, and correct missing/duplicate metadata, canonical, and noindex behavior where needed.
5. Apply only the requested TanStack security updates after the fixes, then verify the build and exercise public directory/blog pages plus an unauthenticated publishing request.

## Technical details
- Use existing directory query helpers and TanStack route loaders/query cache rather than adding per-render database fetches.
- Keep publishing writes server-side and use the existing posts table; never grant browser write access.
- Do not add database indexes without measured query evidence. Keep secrets out of source code; publishing requires the user-provided `BLOG_PUBLISH_KEY` value.
- After the exact dependency update, make only minimal compatibility fixes if needed.

## Waiting on
- The publishing endpoint can return 401 without a key; a successful authorized publish check requires the user to provide `BLOG_PUBLISH_KEY`.
