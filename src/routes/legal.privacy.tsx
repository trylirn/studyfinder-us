import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | TrialFinderUS" },
      { name: "description", content: "How TrialFinderUS collects, uses, and shares information — and why we do not retain patient health data submitted through the eligibility tool." },
    ],
    links: [{ rel: "canonical", href: "/legal/privacy" }],
  }),
  component: Page,
});

function Page() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-12 prose prose-sm dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p><em>Last updated: June 29, 2026</em></p>

      <p>
        This Privacy Policy explains how TrialFinderUS ("TrialFinderUS", "we", "us", or "our") collects, uses,
        shares, and protects information in connection with the TrialFinderUS website and related services
        (the "Service"). Capitalized terms not defined here have the meaning given in our{" "}
        <a href="/legal/terms">Terms of Service</a>.
      </p>

      <h2>1. Who We Are and What We Do</h2>
      <p>
        TrialFinderUS is an <strong>independent informational directory</strong> of clinical trials and research
        studies, sourced primarily from ClinicalTrials.gov. We are <strong>not a medical provider, hospital,
        clinic, research sponsor, investigator, HIPAA-covered entity, or HIPAA business associate</strong>. We do
        not provide medical advice, diagnosis, or treatment. The Service is directed to users located in the
        United States; we do not knowingly direct the Service to, or solicit information from, residents of the
        European Economic Area, the United Kingdom, or any other jurisdiction where the Service would be
        unlawful.
      </p>

      <h2>2. Controller</h2>
      <p>
        The data controller for personal information processed in connection with the Service is{" "}
        <strong>TrialFinderUS</strong>. Privacy questions: <strong>privacy@trialfinderus.example</strong>.
      </p>

      <h2>3. Information We Collect</h2>
      <h3>3.1 Information collected automatically</h3>
      <ul>
        <li><strong>Server access logs</strong>: IP address, user-agent, referring URL, requested URL, HTTP status, timestamp.</li>
        <li><strong>Cookies and similar technologies</strong> that are strictly necessary for the Service to function and, where consented to, privacy-preserving aggregate analytics.</li>
        <li><strong>Aggregate, de-identified usage metrics</strong> such as page views and popular conditions.</li>
      </ul>

      <h3>3.2 Information you provide</h3>
      <ul>
        <li><strong>Administrator and clinic-operator account credentials</strong> (email, securely hashed password) and clinic operator profile fields you choose to provide.</li>
        <li><strong>Eligibility Tool submissions</strong> — see Section 4 for the special handling that applies to this category.</li>
        <li><strong>Inbound communications</strong> (e.g., emails you send us).</li>
      </ul>

      <h3>3.3 What we do NOT collect</h3>
      <p>
        TrialFinderUS does <strong>not</strong> require you to disclose health information to browse the Service.
        We do not knowingly collect or store on our servers: protected health information (PHI) as defined under
        HIPAA; diagnoses; lab results; medications; insurance details; genetic information; or any other clinical
        records, except as expressly described in Section 4 (and in that case only in transit, not at rest).
      </p>

      <h2>4. Eligibility Tool — Stateless Data Flow</h2>
      <p>
        The "Check My Eligibility" tool is intentionally engineered so that <strong>TrialFinderUS does not retain
        your responses or contact information on our servers</strong>. The flow is as follows:
      </p>
      <ol>
        <li>You complete the questionnaire in your browser.</li>
        <li>Your answers (age, gender, ZIP code, diagnosis confirmations) and contact info (name, email, phone) are sent to our backend in memory.</li>
        <li>Our backend assembles a single delivery payload and immediately delivers it to the research site associated with the selected trial (by email or secure webhook).</li>
        <li>Once delivery completes, the response payload is <strong>discarded from memory and is never written to our database</strong>.</li>
        <li>We retain only <strong>delivery metadata</strong>: trial NCT ID, timestamp, delivery channel, and delivery status (success/failure). Delivery metadata does <strong>not</strong> include your name, contact information, diagnosis, or any other answer.</li>
      </ol>
      <p>
        Because TrialFinderUS does not retain Eligibility Tool submissions, we generally cannot retrieve, export,
        or delete the contents of a past submission on your behalf. Once delivered, the receiving research site
        is solely responsible for handling your information under its own privacy practices.
      </p>

      <h2>5. How We Use Information</h2>
      <ul>
        <li>To operate, maintain, secure, and improve the Service.</li>
        <li>To deliver Eligibility Tool submissions to the research site you selected (in memory only; see Section 4).</li>
        <li>To prevent abuse, fraud, and security incidents.</li>
        <li>To produce aggregate, de-identified analytics that help us understand which trials and conditions are most useful to users.</li>
        <li>To comply with law, lawful requests, and our legal obligations.</li>
      </ul>

      <h2>6. Legal Bases (where applicable)</h2>
      <ul>
        <li><strong>Legitimate interests</strong> in operating, securing, and improving the Service.</li>
        <li><strong>Consent</strong> for Eligibility Tool submissions and for non-essential analytics where required.</li>
        <li><strong>Performance of a contract</strong> with clinic operators who hold accounts.</li>
        <li><strong>Compliance with legal obligations</strong>.</li>
      </ul>

      <h2>7. How We Share Information</h2>
      <ul>
        <li><strong>Research sites</strong>: We forward Eligibility Tool submissions to the research site for the selected trial, for the sole purpose of pre-screening you for that trial.</li>
        <li><strong>Service providers</strong>: We use vetted vendors for hosting, email delivery, security, and analytics. These vendors are bound by contract to process information only on our instructions and in line with this Policy.</li>
        <li><strong>Legal and safety</strong>: We may disclose information if required by law, subpoena, or court order, or if we believe in good faith that disclosure is necessary to protect rights, property, or safety.</li>
        <li><strong>Business transfers</strong>: In a merger, acquisition, financing, reorganization, or sale of assets, information may be transferred subject to standard confidentiality protections and continuation of this Policy.</li>
      </ul>
      <p>
        <strong>We do not sell personal information</strong> and we do not share personal information for
        cross-context behavioral advertising, as those terms are defined under the California Consumer Privacy
        Act (as amended by the CPRA) and similar U.S. state privacy laws.
      </p>

      <h2>8. HIPAA Notice</h2>
      <p>
        TrialFinderUS is <strong>not a HIPAA-covered entity or business associate</strong>. Information you
        voluntarily submit through the Eligibility Tool is processed outside HIPAA's framework on our end. Once
        delivered, the receiving research site (which may itself be a HIPAA-covered entity) is solely responsible
        for handling the information in accordance with its own legal obligations. If you do not wish to share
        information outside HIPAA's framework on our end, do not use the Eligibility Tool and contact the
        research site directly.
      </p>

      <h2>9. Cookies and Tracking</h2>
      <p>
        We use first-party cookies that are strictly necessary for the Service to function (for example, to keep
        an authenticated clinic operator signed in). Where we use analytics, we configure them in a
        privacy-preserving manner (IP truncation, no cross-site tracking, no advertising cookies). We honor the
        <strong> Global Privacy Control (GPC)</strong> signal where applicable.
      </p>

      <h2>10. Data Retention</h2>
      <ul>
        <li><strong>Server access logs</strong>: up to 90 days for security and operations.</li>
        <li><strong>Eligibility Tool delivery metadata</strong>: up to 24 months for anti-abuse, analytics, and dispute resolution. (Reminder: this excludes your answers and contact information.)</li>
        <li><strong>Account data</strong>: for the life of the account and a reasonable period after closure for legal, tax, and audit purposes.</li>
        <li><strong>Aggregate/de-identified data</strong>: may be retained indefinitely.</li>
      </ul>

      <h2>11. Security</h2>
      <p>
        We use industry-standard administrative, technical, and physical safeguards designed to protect
        information, including TLS in transit, encryption of credentials, least-privilege backend access, and
        regular dependency hygiene. No method of transmission or storage is 100% secure; we cannot guarantee
        absolute security.
      </p>

      <h2>12. Children</h2>
      <p>
        The Service is not directed to children under 18, and we do not knowingly collect personal information
        from children under 13 in violation of the Children's Online Privacy Protection Act ("COPPA"). If you
        believe a child has provided information to us, contact <strong>privacy@trialfinderus.example</strong>{" "}
        and we will take appropriate action.
      </p>

      <h2>13. U.S. State Privacy Rights</h2>
      <p>
        Residents of <strong>California, Virginia, Colorado, Connecticut, Utah, Texas, Oregon, Montana, Delaware,
        Iowa, Tennessee, Indiana, New Jersey,</strong> and other states with comparable laws may have rights to:
      </p>
      <ul>
        <li>Know what categories of personal information we collect, the sources, the purposes, and the categories of recipients.</li>
        <li>Access a copy of the personal information we hold about you.</li>
        <li>Request correction of inaccurate personal information.</li>
        <li>Request deletion of personal information we hold about you, subject to legal exceptions.</li>
        <li>Opt out of the "sale" or "sharing" of personal information for cross-context behavioral advertising (we do neither).</li>
        <li>Limit the use of "sensitive personal information" as defined under applicable law.</li>
        <li>Be free from discrimination for exercising these rights.</li>
        <li>Appeal a denial of a privacy request.</li>
      </ul>
      <p>
        Because TrialFinderUS does <strong>not retain Eligibility Tool submissions</strong>, there is generally
        no record of those submissions for us to access, correct, or delete. To exercise other rights, email
        <strong> privacy@trialfinderus.example</strong> from the email associated with your interaction. We may
        ask for additional information to verify your identity. Authorized agents may submit requests with
        documented authority and reasonable verification.
      </p>
      <p>
        <strong>California "Shine the Light" (Civ. Code § 1798.83)</strong>: We do not share personal information
        with third parties for their direct marketing purposes.
      </p>

      <h2>14. International Transfers</h2>
      <p>
        The Service is hosted in and intended for users in the United States. If you access the Service from
        outside the United States, your information may be processed in the United States, which may have data
        protection laws different from those of your country.
      </p>

      <h2>15. Third-Party Links</h2>
      <p>
        The Service contains links to third-party websites (including ClinicalTrials.gov, research sites, and
        sponsors). We are not responsible for the privacy practices or content of any third party. Their
        policies apply to your interactions with them.
      </p>

      <h2>16. Breach Notification</h2>
      <p>
        In the unlikely event of a personal-information breach affecting you, we will notify affected users and
        regulators where required by law, in the timeframes required by applicable law.
      </p>

      <h2>17. Changes to This Policy</h2>
      <p>
        We may update this Policy from time to time. We will post the updated Policy on the Service and update
        the "Last updated" date. Material changes will be highlighted where reasonable.
      </p>

      <h2>18. Contact</h2>
      <p>
        Privacy questions, requests, or complaints: <strong>privacy@trialfinderus.example</strong>. You also
        have the right to lodge a complaint with the U.S. Federal Trade Commission or your state attorney
        general.
      </p>
    </article>
  );
}
