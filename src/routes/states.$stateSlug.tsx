import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getStatePage } from "@/lib/directory.functions";
import { StudyCard } from "@/components/StudyCard";

const q = (slug: string) =>
  queryOptions({ queryKey: ["state", slug], queryFn: () => getStatePage({ data: { slug } }) });

export const Route = createFileRoute("/states/$stateSlug")({
  loader: async ({ context, params }) => {
    const d = await context.queryClient.ensureQueryData(q(params.stateSlug));
    if (!d) throw notFound();
    return d;
  },
  head: ({ loaderData, params }) => ({
    meta: [
      { title: `Clinical Trials in ${loaderData?.state?.name ?? params.stateSlug} | TrialFinderUS` },
      { name: "description", content: `Find ${loaderData?.total ?? 0} clinical trials and research studies recruiting in ${loaderData?.state?.name ?? ""}.` },
    ],
    links: [{ rel: "canonical", href: `/states/${params.stateSlug}` }],
  }),
  component: StatePage,
});

function StatePage() {
  const { stateSlug } = Route.useParams();
  const { data } = useSuspenseQuery(q(stateSlug));
  if (!data) return null;
  const { state, studies, total, cities, topConditions } = data;
  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Clinical Trials in {state.name}</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">
        Explore {total.toLocaleString()} clinical trials and research studies in {state.name}, including recruiting trials, observational studies, and treatment studies near you.
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Latest studies</h2>
          {studies.map((s) => <StudyCard key={s.nct_id} study={s} />)}
        </div>
        <aside className="space-y-6">
          {cities.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Top cities</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {cities.map((c) => (
                  <li key={c.slug}>
                    <Link to="/cities/$citySlug" params={{ citySlug: c.slug }} className="hover:text-primary">
                      Clinical trials in {c.name} ({c.study_count.toLocaleString()})
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {topConditions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Popular conditions</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {topConditions.map((c) => (
                  <li key={c.slug}>
                    <Link to="/conditions/$slug" params={{ slug: c.slug }} className="hover:text-primary">{c.name} trials</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
