import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service | TrialFinderUS" },
      { name: "description", content: "The terms governing your use of TrialFinderUS, an independent informational directory of clinical trials and research studies in the United States." },
    ],
    links: [{ rel: "canonical", href: "/legal/terms" }],
  }),
  component: Page,
});

function Page() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-12 prose prose-sm dark:prose-invert">
      <h1>Terms of Service</h1>
      <p><em>Last updated: June 29, 2026</em></p>

      <p>
        These Terms of Service ("Terms") form a binding agreement between you ("you", "your", or "User") and
        TrialFinderUS ("TrialFinderUS", "we", "us", or "our") and govern your access to and use of the
        TrialFinderUS website, mobile interface, APIs, and any related services (collectively, the "Service").
        By accessing or using the Service in any manner, you confirm that you have read, understood, and agree
        to be bound by these Terms, our <a href="/legal/privacy">Privacy Policy</a>, and our{" "}
        <a href="/legal/disclaimer">Medical Disclaimer</a>. If you do not agree, do not use the Service.
      </p>

      <h2>1. About the Service</h2>
      <p>
        TrialFinderUS is an <strong>independent informational directory</strong> that aggregates publicly available
        information about clinical trials and research studies in the United States (primarily from
        ClinicalTrials.gov, a service of the U.S. National Library of Medicine). TrialFinderUS is{" "}
        <strong>not a medical provider, hospital, clinic, research institution, sponsor, investigator,
        contract research organization, HIPAA-covered entity, or HIPAA business associate</strong>. We do not
        conduct, sponsor, design, oversee, enroll patients in, or deliver clinical trials. We do not provide
        medical care, diagnose conditions, prescribe treatments, dispense medications, or make medical
        recommendations.
      </p>
      <p>
        TrialFinderUS is independent and is <strong>not affiliated with, endorsed by, or sponsored by the U.S.
        Government, the U.S. Department of Health and Human Services, the National Institutes of Health, the
        U.S. Food and Drug Administration, or ClinicalTrials.gov</strong>.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least <strong>18 years of age</strong> and able to form a binding contract under the laws
        of your jurisdiction to use the Service. The Service is intended for users located in the United States.
        We do not direct the Service to residents of the European Economic Area, the United Kingdom, or any other
        jurisdiction where the Service would be unlawful. Parents or legal guardians may use the Service to
        research opportunities for minors but may not submit pre-screening information as if they were the minor.
      </p>

      <h2>3. The Service Is Informational Only</h2>
      <ul>
        <li>Content on the Service is provided <strong>for general educational and informational purposes only</strong> and is not medical advice, diagnosis, or treatment.</li>
        <li>The Service does not create a doctor-patient, fiduciary, or any other professional relationship between you and TrialFinderUS or any clinic, sponsor, or investigator.</li>
        <li>We do not recommend, endorse, certify, or guarantee any specific clinical trial, treatment, drug, device, therapy, sponsor, investigator, or research site.</li>
        <li>Trial listings, eligibility criteria, contact information, locations, statuses, and results may be incomplete, outdated, or incorrect. Always verify directly with the research site before acting on any information.</li>
        <li>Always consult a licensed physician or other qualified healthcare professional before starting, stopping, or changing any medical treatment, including enrollment in any clinical trial.</li>
        <li>If you are experiencing a medical emergency, call 911 or your local emergency number immediately. The Service is not for emergencies.</li>
      </ul>

      <h2>4. Account Terms</h2>
      <p>
        Patient accounts are not offered. Accounts on TrialFinderUS are limited to (a) platform administrators and
        (b) verified clinic operators who have claimed a clinic profile. You are responsible for keeping your
        credentials confidential and for all activity that occurs under your account. You agree to provide
        accurate information, maintain it, and notify us promptly of any unauthorized use. We may suspend or
        terminate any account at any time, with or without notice, for any reason or no reason.
      </p>

      <h2>5. Eligibility Pre-Screening Tool</h2>
      <p>
        The "Check My Eligibility" tool ("Eligibility Tool") is a stateless, self-administered pre-screening
        questionnaire that helps you decide whether to contact a specific research site about a specific trial.
        By submitting the Eligibility Tool you represent and agree that:
      </p>
      <ul>
        <li>You are submitting information about yourself or about a person for whom you are the legal guardian or have explicit written authorization to act.</li>
        <li>All answers are truthful and accurate to the best of your knowledge.</li>
        <li>You <strong>consent</strong> to TrialFinderUS forwarding your responses and contact information directly to the research site associated with the selected trial for the sole purpose of pre-screening you for that trial.</li>
        <li>You understand that the Eligibility Tool is <strong>not a clinical evaluation, diagnosis, or guarantee of enrollment</strong>. Final eligibility is determined exclusively by the trial's investigators.</li>
        <li>You understand that TrialFinderUS does not retain your eligibility responses or contact information after delivery (see Privacy Policy for detail).</li>
        <li>You will not submit any information about a third party without their explicit authorization, and you indemnify TrialFinderUS for any harm caused by your submission of false, unauthorized, or fraudulent information.</li>
      </ul>

      <h2>6. AI-Generated Content</h2>
      <p>
        Portions of the Service include plain-language summaries and other content generated by artificial
        intelligence ("AI Content"). AI Content may contain errors, omissions, oversimplifications, hallucinations,
        or out-of-date information. AI Content is provided <strong>"as is" for general educational purposes only</strong>{" "}
        and is not medical advice. Always read the original trial protocol and consult a qualified medical
        professional before relying on any AI Content.
      </p>

      <h2>7. Paid Placement and Referral Fees</h2>
      <p>
        TrialFinderUS may receive a referral fee from research sites for verified patient introductions, and
        clinics may purchase featured or premium placement that increases their visibility on certain pages.
        Where required, paid placement is labeled (for example, "Featured"). Paid placement does not constitute
        an endorsement and does not affect the medical accuracy of trial data.
      </p>

      <h2>8. Third-Party Sites and Sponsors</h2>
      <p>
        The Service contains information about, and links to, third-party clinics, sponsors, investigators, and
        websites. TrialFinderUS does not control, endorse, or guarantee any third party. We are not responsible
        for any third party's conduct, content, products, services, or privacy practices. Once your information
        is delivered to a research site through the Eligibility Tool, that organization's own privacy and
        information-security practices apply to its handling of your information.
      </p>

      <h2>9. Acceptable Use</h2>
      <p>You agree not to, and not to permit any third party to:</p>
      <ul>
        <li>Use the Service for any unlawful, fraudulent, harmful, or harassing purpose.</li>
        <li>Submit false, misleading, or unauthorized information through the Eligibility Tool or any form.</li>
        <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity.</li>
        <li>Scrape, crawl, harvest, or mass-download the Service except through documented, well-behaved means; circumvent rate limits; or use automated systems to submit forms.</li>
        <li>Reverse engineer, decompile, or attempt to derive source code from the Service except to the limited extent permitted by law.</li>
        <li>Probe, scan, or test the vulnerability of the Service or breach any security or authentication measure.</li>
        <li>Upload viruses, worms, or other malicious code; interfere with or disrupt the Service.</li>
        <li>Use the Service to develop a competing product or to train any machine-learning model without our prior written permission.</li>
      </ul>

      <h2>10. Intellectual Property</h2>
      <p>
        The Service and all of its compilation, organization, design, branding, software, text, graphics, and
        other content (excluding trial data sourced from third parties) are owned by TrialFinderUS or its
        licensors and protected by U.S. and international intellectual-property laws. Trial data sourced from
        ClinicalTrials.gov is in the public domain and is attributed accordingly. We grant you a limited,
        non-exclusive, non-transferable, revocable license to access and use the Service for your personal,
        non-commercial use, subject to these Terms.
      </p>

      <h2>11. DMCA Notices</h2>
      <p>
        If you believe content on the Service infringes your copyright, send a notice meeting 17 U.S.C. § 512(c)(3)
        requirements to: <strong>dmca@trialfinderus.example</strong>. Include identification of the work, the
        infringing material and its URL, your contact information, a good-faith statement, an accuracy statement
        under penalty of perjury, and your physical or electronic signature. Repeat infringers will be
        terminated. Counter-notices may be sent to the same address.
      </p>

      <h2>12. Disclaimers</h2>
      <p>
        <strong>The Service is provided on an "AS IS" and "AS AVAILABLE" basis, with all faults and without
        warranty of any kind.</strong> To the fullest extent permitted by law, TrialFinderUS and its officers,
        directors, employees, agents, affiliates, licensors, and suppliers disclaim all warranties, express or
        implied, including without limitation any warranty of merchantability, fitness for a particular purpose,
        non-infringement, title, accuracy, completeness, timeliness, reliability, availability, security,
        non-interruption, or freedom from harmful components. Without limiting the foregoing, we make no
        representation or warranty that (a) trial information is accurate, current, or complete; (b) any trial
        listed is open, will accept you, or is appropriate for your condition; (c) any research site will
        respond to or accept your pre-screening submission; (d) AI Content is accurate; or (e) the Service will
        meet your expectations.
      </p>

      <h2>13. Limitation of Liability</h2>
      <p>
        <strong>To the maximum extent permitted by law, TrialFinderUS and its officers, directors, employees,
        agents, affiliates, licensors, and suppliers shall not be liable for any indirect, incidental, special,
        consequential, exemplary, or punitive damages</strong> (including damages for lost profits, lost revenue,
        lost data, loss of goodwill, business interruption, personal injury, emotional distress, or any other
        intangible loss) arising out of or related to your access to or use of, or inability to access or use,
        the Service, any content on the Service, the Eligibility Tool, AI Content, lead delivery, third-party
        clinics or sponsors, or these Terms, whether based in warranty, contract, tort (including negligence),
        statute, or any other legal theory, and whether or not we have been advised of the possibility of such
        damages. <strong>In no event shall our total aggregate liability arising out of or related to the
        Service or these Terms exceed the greater of (a) one hundred U.S. dollars (US$100) or (b) the amount,
        if any, you paid to TrialFinderUS in the twelve months preceding the event giving rise to the claim.</strong>{" "}
        Some jurisdictions do not allow the exclusion of certain warranties or limitation of liability for
        consequential damages; in such jurisdictions liability is limited to the fullest extent permitted by law.
      </p>

      <h2>14. Indemnification</h2>
      <p>
        You agree to defend, indemnify, and hold harmless TrialFinderUS and its officers, directors, employees,
        agents, affiliates, licensors, and suppliers from and against any and all claims, liabilities, damages,
        losses, costs, and expenses (including reasonable attorneys' fees) arising out of or related to
        (a) your access to or use of the Service; (b) your violation of these Terms; (c) your violation of any
        third-party right, including any intellectual-property, privacy, or publicity right; (d) any
        information you submit through the Eligibility Tool, including any false, misleading, or unauthorized
        submission; or (e) any dispute between you and any clinic, sponsor, investigator, or other user.
      </p>

      <h2>15. Termination</h2>
      <p>
        We may suspend or terminate your access to the Service at any time, with or without notice, for any
        reason or no reason. Upon termination, the rights granted to you under these Terms will end. Sections
        that by their nature should survive termination will survive, including without limitation Sections
        10, 12, 13, 14, 16, 17, and 18.
      </p>

      <h2>16. Governing Law and Venue</h2>
      <p>
        These Terms are governed by the laws of the State of Delaware, without regard to its conflict-of-laws
        principles. Subject to Section 17, the state and federal courts located in New Castle County, Delaware
        will have exclusive jurisdiction over any dispute that is not subject to arbitration, and you consent
        to personal jurisdiction and venue in those courts.
      </p>

      <h2>17. Arbitration and Class-Action Waiver</h2>
      <p>
        <strong>Please read this section carefully — it affects your legal rights.</strong> You and TrialFinderUS
        agree that any dispute, claim, or controversy arising out of or relating to the Service or these Terms
        (a "Dispute") will be resolved by binding individual arbitration administered by the American Arbitration
        Association under its Consumer Arbitration Rules. The arbitration will be conducted in English in
        Wilmington, Delaware, or, at your election, by telephone or videoconference. <strong>You and TrialFinderUS
        each waive any right to a jury trial and any right to bring or participate in a class, collective, or
        representative action.</strong> Either party may bring an individual action in small-claims court for
        Disputes within that court's jurisdiction. You may opt out of this arbitration agreement by emailing
        <strong> arbitration-optout@trialfinderus.example</strong> within 30 days of first accepting these Terms;
        the email must include your full name and a clear statement of your intent to opt out. If any portion
        of this Section is found unenforceable, that portion will be severed and the remainder will continue
        to apply.
      </p>

      <h2>18. Changes to the Service or Terms</h2>
      <p>
        We may change, suspend, or discontinue the Service or any portion of it at any time. We may also update
        these Terms from time to time. We will post the updated Terms on the Service and update the "Last
        updated" date. Your continued use of the Service after the effective date constitutes your acceptance
        of the updated Terms.
      </p>

      <h2>19. Miscellaneous</h2>
      <p>
        If any provision of these Terms is held invalid or unenforceable, that provision will be enforced to
        the maximum extent permissible and the remaining provisions will continue in full force and effect.
        Our failure to enforce any right or provision is not a waiver. You may not assign these Terms without
        our prior written consent; we may assign them freely. These Terms, together with our Privacy Policy
        and Medical Disclaimer, are the entire agreement between you and TrialFinderUS regarding the Service
        and supersede all prior agreements on the subject.
      </p>

      <h2>20. Contact</h2>
      <p>
        Questions about these Terms: <strong>legal@trialfinderus.example</strong>.
      </p>
    </article>
  );
}
