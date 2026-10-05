# Finish blog, faster directory pages, and final cleanup

## Work
1. Fix the remaining blog type errors (typed post fields and tag list) so the preview builds cleanly.
2. Make Conditions, States, Sponsors, Clinics, and Recruiting load their first results before the page shows (route prefetch with the shared query helpers), fixing Recruiting's blank-until-refresh.
3. Add a Blog link to the header and footer, and list published posts in the sitemap.
4. Add the BLOG_PUBLISH_KEY secret through the secure form for you to paste the value into.
5. Remove stale legal wording (referral fees, clinic operator, patient accounts), add full metadata plus noindex to the sign-in page, and fix any remaining SEO findings from the completed audit.
6. Apply the requested TanStack package security update, then verify the build and check the directory pages, blog pages, and that publishing without the key is rejected.

## Technical details
- Loaders use `context.queryClient.ensureQueryData` with primitive query keys from `src/lib/directory-queries.ts`; components use `useSuspenseQuery`.
- Publishing stays server-only via `/api/public/posts`; no new indexes unless a measured query requires one.
