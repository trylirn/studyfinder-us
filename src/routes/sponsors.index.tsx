import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listSponsors } from "@/lib/directory.functions";

const q = queryOptions({ queryKey: ["sponsors"], queryFn: () => listSponsors() });

export const Route = createFileRoute("/sponsors/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  head: () => ({
    meta: [
      { title: "Top Clinical Trial Sponsors | TrialFinderUS" },
      { name: "description", content: "Browse clinical trials by sponsor — pharma, biotech, NIH, and academic medical centers." },
    ],
    links: [{ rel: "canonical", href: "/sponsors" }],
  }),
  component: () => {
    const { data } = useSuspenseQuery(q);
    return (
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Clinical Trial Sponsors</h1>
        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {data.map((s) => (
            <Link key={s.slug} to="/sponsors/$slug" params={{ slug: s.slug }} className="rounded-md border border-border bg-card p-3 hover:border-primary/60">
              <p className="text-sm font-medium">{s.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.study_count.toLocaleString()} studies</p>
            </Link>
          ))}
        </div>
      </div>
    );
  },
});
