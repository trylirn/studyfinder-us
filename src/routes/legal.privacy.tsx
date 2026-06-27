import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | TrialFinderUS" },
      { name: "description", content: "How TrialFinderUS handles your information when you browse or use the eligibility pre-screening tool." },
    ],
    links: [{ rel: "canonical", href: "/legal/privacy" }],
  }),
  component: Page,
});

function Page() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-12 prose prose-sm dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p><em>Last updated: June 27, 2026</em></p>
      <h2>What we collect</h2>
      <ul>
        <li>Standard server access logs (IP address, user agent, referrer, page viewed).</li>
        <li>Aggregate, non-personal usage metrics (e.g., which conditions are popular).</li>
      </ul>
      <h2>Eligibility pre-screening tool</h2>
      <p>
        When you submit the "Check My Eligibility" form, your answers (age, gender, ZIP, diagnosis confirmations) and
        contact info (name, email, phone) are <strong>not stored on TrialFinderUS servers</strong>. They are packaged
        into a single message and delivered directly to the research site associated with the trial you selected. We
        retain only delivery metadata (trial ID, timestamp, delivery status) for operational and anti-abuse purposes.
      </p>
      <h2>Cookies</h2>
      <p>
        We use first-party cookies for basic site functionality. We may use privacy-preserving analytics that do not
        identify individual users.
      </p>
      <h2>Sharing</h2>
      <p>
        Information submitted through the eligibility tool is shared with the research site for the selected trial,
        for the sole purpose of pre-screening you for that trial. We do not sell personal data.
      </p>
      <h2>Your rights</h2>
      <p>
        Because we do not retain submitted pre-screening responses, there is generally nothing for us to retrieve or
        delete on your behalf. For questions, contact privacy@trialfinderus.example.
      </p>
    </article>
  );
}
