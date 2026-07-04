import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getCityPage } from "@/lib/directory.functions";
import { StudyCard } from "@/components/StudyCard";

const q = (slug: string) =>
  queryOptions({ queryKey: ["city", slug], queryFn: () => getCityPage({ data: { slug } }) });

export const Route = createFileRoute("/cities/$citySlug")({
  loader: async ({ context, params }) => {
    const d = await context.queryClient.ensureQueryData(q(params.citySlug));
    if (!d) throw notFound();
    return d;
  },
  head: ({ loaderData, params }) => {
    const cityName = loaderData?.city?.name ?? params.citySlug;
    const abbr = loaderData?.state?.abbr;
    const stateName = loaderData?.state?.name;
    const total = loaderData?.total ?? 0;
    const title = abbr
      ? `Clinical Trials in ${cityName}, ${abbr} | TrialFinderUS`
      : `Clinical Trials in ${cityName} | TrialFinderUS`;
    const desc = `Find ${total} clinical trials and research studies recruiting in ${cityName}${abbr ? `, ${abbr}` : ""}.`;
    const url = `https://studyfinder-us.lovable.app/cities/${params.citySlug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `Clinical Trials in ${cityName}${abbr ? `, ${abbr}` : ""}`,
            description: desc,
            url,
            about: {
              "@type": "Place",
              name: cityName,
              address: {
                "@type": "PostalAddress",
                addressLocality: cityName,
                addressRegion: stateName ?? abbr ?? undefined,
                addressCountry: "US",
              },
            },
          }),
        },
      ],
    };
  },

  component: CityPage,
});

function CityPage() {
  const { citySlug } = Route.useParams();
  const { data } = useSuspenseQuery(q(citySlug));
  if (!data) return null;
  const { city, state, studies, total, nearby } = data;
  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">
        Clinical Trials in {city.name}{state ? `, ${state.abbr}` : ""}
      </h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">
        {total.toLocaleString()} clinical trials and research studies near {city.name}.
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          {studies.map((s) => <StudyCard key={s.nct_id} study={s} />)}
        </div>
        <aside>
          {nearby.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Nearby cities</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {nearby.map((c) => (
                  <li key={c.slug}>
                    <Link to="/cities/$citySlug" params={{ citySlug: c.slug }} className="hover:text-primary">
                      {c.name}
                    </Link>
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
