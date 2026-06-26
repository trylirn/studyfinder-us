import { createFileRoute, Link } from "@tanstack/react-router";

const ARTICLES = [
  { slug: "what-are-clinical-trials", title: "What are clinical trials?" },
  { slug: "how-trials-work", title: "How clinical trials work" },
  { slug: "phases-explained", title: "Clinical trial phases explained" },
  { slug: "risks-and-benefits", title: "Risks and benefits of participating" },
  { slug: "how-to-participate", title: "How to participate in a clinical trial" },
  { slug: "eligibility-requirements", title: "Common eligibility requirements" },
  { slug: "faq", title: "Frequently asked questions" },
];

export const Route = createFileRoute("/learn/")({
  head: () => ({
    meta: [
      { title: "Learn About Clinical Trials | TrialFinderUS" },
      { name: "description", content: "Plain-English guides about clinical trials: phases, eligibility, risks, benefits, and how to participate." },
    ],
    links: [{ rel: "canonical", href: "/learn" }],
  }),
  component: () => (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Learn about clinical trials</h1>
      <p className="mt-3 text-muted-foreground">
        Clear, plain-English answers to the most common questions about clinical research and how to take part.
      </p>
      <ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
        {ARTICLES.map((a) => (
          <li key={a.slug}>
            <Link to="/learn/$slug" params={{ slug: a.slug }} className="block px-5 py-4 hover:bg-accent/40">
              <p className="font-medium">{a.title}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  ),
});
