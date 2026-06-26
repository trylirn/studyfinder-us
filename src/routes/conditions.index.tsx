import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listConditions } from "@/lib/directory.functions";

const q = queryOptions({ queryKey: ["conditions"], queryFn: () => listConditions() });

export const Route = createFileRoute("/conditions/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  head: () => ({
    meta: [
      { title: "All Conditions — Clinical Trials Directory | TrialFinderUS" },
      { name: "description", content: "Browse clinical trials by medical condition. From diabetes and cancer to rare diseases." },
    ],
    links: [{ rel: "canonical", href: "/conditions" }],
  }),
  component: () => {
    const { data } = useSuspenseQuery(q);
    return (
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Conditions</h1>
        <p className="mt-2 text-muted-foreground">Find clinical trials by condition.</p>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {data.map((c) => (
            <Link key={c.slug} to="/conditions/$slug" params={{ slug: c.slug }} className="rounded-md border border-border bg-card p-3 hover:border-primary/60">
              <p className="text-sm font-medium">{c.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{c.study_count.toLocaleString()} studies</p>
            </Link>
          ))}
        </div>
      </div>
    );
  },
});
