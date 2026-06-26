import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getSponsorPage } from "@/lib/directory.functions";
import { StudyCard } from "@/components/StudyCard";

const q = (slug: string) =>
  queryOptions({ queryKey: ["sponsor", slug], queryFn: () => getSponsorPage({ data: { slug } }) });

export const Route = createFileRoute("/sponsors/$slug")({
  loader: async ({ context, params }) => {
    const d = await context.queryClient.ensureQueryData(q(params.slug));
    if (!d) throw notFound();
    return d;
  },
  head: ({ loaderData, params }) => ({
    meta: [
      { title: `${loaderData?.sponsor?.name ?? params.slug} Clinical Trials | TrialFinderUS` },
      { name: "description", content: `Browse ${loaderData?.total ?? 0} clinical trials sponsored by ${loaderData?.sponsor?.name ?? ""} in the United States.` },
    ],
    links: [{ rel: "canonical", href: `/sponsors/${params.slug}` }],
  }),
  component: () => {
    const { slug } = Route.useParams();
    const { data } = useSuspenseQuery(q(slug));
    if (!data) return null;
    return (
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <nav className="text-sm text-muted-foreground"><Link to="/sponsors" className="hover:text-primary">Sponsors</Link></nav>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{data.sponsor.name} Clinical Trials</h1>
        <p className="mt-2 text-muted-foreground">{data.total.toLocaleString()} studies sponsored by {data.sponsor.name}.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {data.studies.map((s) => <StudyCard key={s.nct_id} study={s} />)}
        </div>
      </div>
    );
  },
});
