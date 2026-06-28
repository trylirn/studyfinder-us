import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getClinicPage } from "@/lib/directory.functions";
import { StudyCard } from "@/components/StudyCard";
import { Hospital, MapPin, Building2 } from "lucide-react";

const q = (slug: string) =>
  queryOptions({ queryKey: ["clinic", slug], queryFn: () => getClinicPage({ data: { slug } }) });

export const Route = createFileRoute("/clinics/$slug")({
  loader: async ({ context, params }) => {
    const d = await context.queryClient.ensureQueryData(q(params.slug));
    if (!d) throw notFound();
    return d;
  },
  head: ({ loaderData, params }) => {
    const c = loaderData?.clinic as any;
    const name = c?.name ?? params.slug;
    return {
      meta: [
        { title: `${name} — Clinical Research Site | TrialFinderUS` },
        { name: "description", content: `${name} in ${[c?.city, c?.state].filter(Boolean).join(", ")}. Active recruiting clinical trials and contact information.` },
      ],
      links: [{ rel: "canonical", href: `/clinics/${params.slug}` }],
    };
  },
  component: ClinicPage,
});

function ClinicPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(q(slug));
  if (!data) return null;
  const clinic = data.clinic as any;
  const trials = (data.trials ?? []) as any[];
  const ld = {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    name: clinic.name,
    address: {
      "@type": "PostalAddress",
      addressLocality: clinic.city,
      addressRegion: clinic.state,
      postalCode: clinic.zip,
      addressCountry: "US",
    },
    url: `/clinics/${clinic.slug}`,
  };

  return (
    <article className="container mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <nav className="mb-3 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-primary">Home</Link> /{" "}
        <Link to="/clinics" className="hover:text-primary">Clinics</Link>
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight md:text-3xl">
            <Hospital className="h-6 w-6 text-primary" /> {clinic.name}
          </h1>
          <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" /> {[clinic.address_line1, clinic.city, clinic.state, clinic.zip].filter(Boolean).join(", ")}
          </p>
          <p className="mt-2 text-sm">
            <span className="rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success">
              {clinic.recruiting_count} recruiting trial{clinic.recruiting_count === 1 ? "" : "s"}
            </span>
            {clinic.claim_status !== "claimed" && (
              <span className="ml-2 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground">
                Unclaimed profile
              </span>
            )}
          </p>
        </div>
        {clinic.claim_status !== "claimed" && (
          <Link
            to="/auth"
            className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
          >
            Claim this clinic
          </Link>
        )}
      </div>

      {clinic.description && (
        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Building2 className="h-4 w-4" /> About
          </h2>
          <p className="whitespace-pre-line text-sm leading-6">{clinic.description}</p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Trials currently recruiting here</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {trials.length > 0 ? (
            trials.map((s) => <StudyCard key={s.nct_id} study={s} />)
          ) : (
            <p className="text-sm text-muted-foreground">No active trials linked to this site yet.</p>
          )}
        </div>
      </section>
    </article>
  );
}
