import { createFileRoute, Link, notFound } from "@tanstack/react-router";

const CONTENT: Record<string, { title: string; body: string }> = {
  "what-are-clinical-trials": {
    title: "What are clinical trials?",
    body: `Clinical trials are research studies that test new ways to prevent, detect, diagnose, or treat health conditions. They are how nearly every modern medical treatment is proven safe and effective before it becomes widely available.

People volunteer for trials for many reasons — to access promising new therapies, to contribute to medical knowledge, or to help others living with the same condition.`,
  },
  "how-trials-work": {
    title: "How clinical trials work",
    body: `Each clinical trial follows a written plan called a protocol that explains who can join, what tests and treatments will be given, and what data will be collected.

Trials are reviewed by independent ethics committees (IRBs) and government regulators to protect participants. You can leave a trial at any time, for any reason.`,
  },
  "phases-explained": {
    title: "Clinical trial phases explained",
    body: `Phase 1 trials test a treatment in a small group to evaluate safety and dosing.
Phase 2 trials look at whether it works for a specific condition.
Phase 3 trials compare it to current standard care in larger populations.
Phase 4 trials study long-term effects after a treatment is approved.`,
  },
  "risks-and-benefits": {
    title: "Risks and benefits",
    body: `Possible benefits include access to new treatments, close monitoring by a research team, and contributing to science.

Possible risks include side effects, time commitment, and that the treatment may not help you. Always discuss a trial with your own doctor before enrolling.`,
  },
  "how-to-participate": {
    title: "How to participate",
    body: `1. Search by your condition or location on TrialFinderUS.
2. Review the eligibility criteria.
3. Contact the study team listed on the trial page.
4. Go through informed consent and screening.
5. If eligible, begin participation.`,
  },
  "eligibility-requirements": {
    title: "Common eligibility requirements",
    body: `Most trials specify a minimum and maximum age, gender (where relevant), diagnosis, prior treatments, and overall health. These criteria protect participants and help researchers answer the study question.`,
  },
  faq: {
    title: "Frequently asked questions",
    body: `Are clinical trials safe? Trials are tightly regulated, but every medical treatment carries some risk.
Do I get paid? Some studies offer compensation for time and travel — see the study page.
Will my insurance cover it? Many study-related costs are paid by the sponsor; routine care is usually billed to insurance.`,
  },
};

export const Route = createFileRoute("/learn/$slug")({
  loader: ({ params }) => {
    const a = CONTENT[params.slug];
    if (!a) throw notFound();
    return a;
  },
  head: ({ loaderData, params }) => ({
    meta: [
      { title: `${loaderData?.title ?? params.slug} | TrialFinderUS` },
      { name: "description", content: loaderData?.body.slice(0, 160) ?? "" },
    ],
    links: [{ rel: "canonical", href: `/learn/${params.slug}` }],
  }),
  component: () => {
    const data = Route.useLoaderData();
    return (
      <article className="container mx-auto max-w-2xl px-4 py-10">
        <nav className="text-sm text-muted-foreground">
          <Link to="/learn" className="hover:text-primary">Learn</Link>
        </nav>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{data.title}</h1>
        <div className="prose mt-6 max-w-none whitespace-pre-line text-foreground/90">{data.body}</div>
      </article>
    );
  },
});
