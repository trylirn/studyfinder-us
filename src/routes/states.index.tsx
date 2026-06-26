import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listStates } from "@/lib/directory.functions";

const q = queryOptions({ queryKey: ["states"], queryFn: () => listStates() });

export const Route = createFileRoute("/states/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  head: () => ({
    meta: [
      { title: "Clinical Trials by State — All 50 U.S. States | TrialFinderUS" },
      { name: "description", content: "Browse clinical trials and research studies in every U.S. state." },
    ],
    links: [{ rel: "canonical", href: "/states" }],
  }),
  component: () => {
    const { data } = useSuspenseQuery(q);
    return (
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Clinical Trials by State</h1>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {data.map((s) => (
            <Link key={s.slug} to="/states/$stateSlug" params={{ stateSlug: s.slug }} className="rounded-md border border-border bg-card p-3 hover:border-primary/60">
              <p className="text-sm font-medium">{s.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.study_count.toLocaleString()} studies</p>
            </Link>
          ))}
        </div>
      </div>
    );
  },
});
