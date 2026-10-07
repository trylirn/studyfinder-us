# Match the favicon and improve trial eligibility checks

## What will change
- Replace the current pin favicon with the same teal rounded-square and white Activity pulse mark used in the site header.
- In a positive eligibility result, show a link to the suggested research clinic’s directory profile when available, and a link to the trial’s condition page when available.
- Replace diagnosis checkboxes with plain-language yes/no questions tailored to that study’s published eligibility criteria. Generate and reuse questions for the study; keep every answer in the visitor’s browser and never send or save answers.
- Keep the existing age, gender, recruiting-status, ZIP, and medical-disclaimer checks. Clearly describe the result as preliminary, not medical advice or a medical decision.

## Technical approach
- Extend the current study detail data passed into the eligibility modal with condition and clinic slugs/names, without adding visitor data collection or tracking.
- Generate a small structured question set from the study’s eligibility text through the existing server-side Lovable AI setup, and reuse cached study-only question text to limit repeat calls. The AI receives no visitor answers; local matching evaluates answers in the browser.
- Update only the favicon, eligibility modal, study detail page, and the narrow server-function changes needed for question generation/cache reuse.

## Verification
- Check the favicon visibly matches the header mark.
- Walk through the eligibility check and confirm tailored yes/no questions, positive-result clinic/condition links, and that answers are not submitted or persisted.
- Check a study without a linked clinic or condition still has a clear result, and confirm the preview has no build errors.
