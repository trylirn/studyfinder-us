## Problem

On `/get-matched`, submitting a multi-word condition like "Chronic Migraine" returns:

> Couldn't match: syntax error in tsquery: "Chronic Migraine"

Root cause in `src/lib/match.functions.ts`:

```ts
sq = sq.or(`condition_slugs.cs.{${data.condition}},search_tsv.fts.${safe}`);
```

PostgREST `fts` maps to `to_tsquery`, which requires explicit boolean operators between tokens (`Chronic & Migraine`). Any plain multi-word phrase throws the tsquery syntax error the user is seeing.

## Fix

Switch the full-text branch from `fts` (to_tsquery) to `plfts` (plainto_tsquery), which safely accepts plain phrases with spaces. Also tighten the sanitizer so URL-reserved characters (`,`, parentheses, colon) can't break the `.or()` filter list.

### File to change

- `src/lib/match.functions.ts`
  - Replace the safe-string sanitizer to strip commas/parens/colons in addition to non-word chars.
  - Change `search_tsv.fts.${safe}` → `search_tsv.plfts.${safe}`.
  - Guard against an empty `safe` string (fall back to slug-only match) so a purely punctuation input doesn't send `plfts.`.

No UI changes, no schema changes, no other files touched. Matching quality stays the same or improves (plainto handles phrase input more predictably than to_tsquery).

## Verification

- Rerun the quiz with "Chronic Migraine" + ZIP 77030 and confirm results (or the graceful "no matches, showing nearest sites" fallback) render instead of the tsquery error.
- Rerun with a single-word condition ("Migraine") to confirm the slug-only path still works.
