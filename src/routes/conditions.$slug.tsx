import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getConditionPage } from "@/lib/directory.functions";
import { StudyCard } from "@/components/StudyCard";

const q = (slug: string) =>
  queryOptions({ queryKey: ["condition", slug], queryFn: () => getConditionPage({ data: { slug } }) });

export const Route = createFileRoute("/conditions/$slug")({
  loader: async ({ context, params }) => {
    const d = await context.queryClient.ensureQueryData(q(params.slug));
    if (!d) throw notFound();
    return d;
  },
  head: ({ loaderData, params }) => {
    const name = loaderData?.condition?.name ?? params.slug;
    return {
      meta: [
        { title: `${name} Clinical Trials in the U.S. | TrialFinderUS` },
        { name: "description", content: `Browse ${loaderData?.total ?? 0} ${name} clinical trials and research studies recruiting in the United States.` },
      ],
      links: [{ rel: "canonical", href: `/conditions/${params.slug}` }],
    };
  },
  component: ConditionPage,
});

function ConditionPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(q(slug));
  if (!data) return null;
  const { condition, studies, total, topStates, related } = data;
  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <nav className="text-sm text-muted-foreground">
        <Link to="/" className="hover:text-primary">Home</Link> /{" "}
        <Link to="/conditions" className="hover:text-primary">Conditions</Link>
      </nav>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{condition.name} Clinical Trials</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">
        Discover <strong>{total.toLocaleString()}</strong> clinical trials and research studies for {condition.name} across the United States,
        including actively recruiting trials, observational studies, and treatment studies.
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <h2 className="text-lg font-semibold">Latest {condition.name} studies</h2>
          {(studies as any[]).map((s) => <StudyCard key={s.nct_id} study={s} />)}
        </div>
        <aside className="space-y-6">
          {topStates.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Popular states</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {topStates.map((s) => (
                  <li key={s.slug}>
                    <Link to="/states/$stateSlug" params={{ stateSlug: s.slug }} className="hover:text-primary">
                      {condition.name} trials in {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {related.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Related conditions</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {related.map((c) => (
                  <li key={c.slug}>
                    <Link to="/conditions/$slug" params={{ slug: c.slug }} className="hover:text-primary">{c.name}</Link>
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
