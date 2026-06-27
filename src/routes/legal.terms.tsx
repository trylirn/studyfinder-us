import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service | TrialFinderUS" },
      { name: "description", content: "Terms governing your use of TrialFinderUS." },
    ],
    links: [{ rel: "canonical", href: "/legal/terms" }],
  }),
  component: Page,
});

function Page() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-12 prose prose-sm dark:prose-invert">
      <h1>Terms of Service</h1>
      <p><em>Last updated: June 27, 2026</em></p>
      <p>
        By using TrialFinderUS you agree to these terms. If you do not agree, do not use the site.
      </p>
      <h2>Informational use only</h2>
      <p>
        TrialFinderUS is an informational directory. We make no representations about the accuracy, completeness, or
        timeliness of trial information. See the Medical Disclaimer for additional details.
      </p>
      <h2>Eligibility tool</h2>
      <p>
        You may use the "Check My Eligibility" tool only for yourself or someone you are legally authorized to act
        for. You agree not to submit false information. By submitting, you consent to your information being shared
        with the selected research site.
      </p>
      <h2>Acceptable use</h2>
      <p>
        You may not scrape, abuse, or attempt to disrupt the service. Automated access is permitted only via
        published, well-behaved means.
      </p>
      <h2>No warranty; limitation of liability</h2>
      <p>
        The site is provided "as is". To the fullest extent permitted by law, TrialFinderUS disclaims all warranties
        and is not liable for any indirect or consequential damages arising from your use of the site.
      </p>
      <h2>Changes</h2>
      <p>We may update these terms from time to time. Continued use constitutes acceptance.</p>
    </article>
  );
}
