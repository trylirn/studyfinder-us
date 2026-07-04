import { createFileRoute } from "@tanstack/react-router";

const BODY = `# TrialFinderUS

> Directory of clinical trials and research studies recruiting across the United States. Search by condition, phase, state, city, sponsor, or research site — updated daily from ClinicalTrials.gov.

## Pages

- [Home](/): Search recruiting clinical trials in the U.S.
- [Recruiting studies](/recruiting): Studies actively enrolling participants right now.
- [Conditions](/conditions): Browse trials grouped by medical condition.
- [States](/states): Browse trials by U.S. state.
- [Sponsors](/sponsors): Browse trials by sponsor or CRO.
- [Clinical research sites](/clinics): Directory of hospitals and clinics running trials.
- [Get matched](/get-matched): Free anonymous quiz to find nearby trials for your condition.
- [Learn](/learn): Plain-language articles about clinical research.

## Optional

- [Phase 1 trials](/phase/1)
- [Phase 2 trials](/phase/2)
- [Phase 3 trials](/phase/3)
- [Phase 4 trials](/phase/4)
- [Search](/search): Full-text search across studies.
- [Privacy](/legal/privacy)
- [Terms](/legal/terms)
- [Medical disclaimer](/legal/disclaimer)
`;

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(BODY, {
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
        }),
    },
  },
});
