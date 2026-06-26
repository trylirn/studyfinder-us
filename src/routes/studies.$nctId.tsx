import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getStudy } from "@/lib/directory.functions";
import { Badge } from "@/components/ui/badge";
import { phaseLabel, statusLabel } from "@/lib/slug";
import { Building2, Calendar, MapPin, Users, ExternalLink } from "lucide-react";

const studyQuery = (nctId: string) =>
  queryOptions({
    queryKey: ["study", nctId],
    queryFn: () => getStudy({ data: { nctId } }),
  });

export const Route = createFileRoute("/studies/$nctId")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(studyQuery(params.nctId));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const title = loaderData?.study?.title ?? params.nctId;
    const desc =
      loaderData?.study?.brief_summary?.slice(0, 160) ??
      `Details, eligibility, locations, and sponsor for clinical trial ${params.nctId}.`;
    return {
      meta: [
        { title: `${title} (${params.nctId}) | TrialFinderUS` },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
      links: [{ rel: "canonical", href: `/studies/${params.nctId}` }],
    };
  },
  component: StudyPage,
});

function StudyPage() {
  const { nctId } = Route.useParams();
  const { data } = useSuspenseQuery(studyQuery(nctId));
  if (!data) return null;
  const { study, locations, related } = data;
  const isRecruiting = study.overall_status === "RECRUITING";
  const eligibility = (study.eligibility ?? {}) as { criteria?: string; healthyVolunteers?: string };

  const ld = {
    "@context": "https://schema.org",
    "@type": "MedicalStudy",
    name: study.title,
    identifier: study.nct_id,
    status: statusLabel(study.overall_status),
    studyDesign: study.study_type,
    sponsor: study.sponsor_name ? { "@type": "Organization", name: study.sponsor_name } : undefined,
    healthCondition: (study.conditions ?? []).map((c) => ({ "@type": "MedicalCondition", name: c })),
    description: study.brief_summary,
    url: `/studies/${study.nct_id}`,
  };

  return (
    <article className="container mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-primary">Home</Link>
        <span className="mx-2">/</span>
        <Link to="/search" className="hover:text-primary">Studies</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{study.nct_id}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className={isRecruiting ? "border-success/40 bg-success/10 text-success" : ""}>
          {statusLabel(study.overall_status)}
        </Badge>
        {study.phase && <Badge variant="secondary">{phaseLabel(study.phase)}</Badge>}
        {study.study_type && <Badge variant="outline">{study.study_type}</Badge>}
        <span className="text-muted-foreground">{study.nct_id}</span>
      </div>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">{study.title}</h1>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          {study.brief_summary && (
            <Card title="Brief summary">
              <p className="whitespace-pre-line text-sm leading-6 text-foreground/90">{study.brief_summary}</p>
            </Card>
          )}
          {study.detailed_description && (
            <Card title="Detailed description">
              <p className="whitespace-pre-line text-sm leading-6 text-foreground/90">{study.detailed_description}</p>
            </Card>
          )}
          <Card title="Eligibility">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Gender" value={study.gender ?? "All"} />
              <Field
                label="Age"
                value={
                  study.min_age_years || study.max_age_years
                    ? `${study.min_age_years ?? "—"} to ${study.max_age_years ?? "—"} years`
                    : "All ages"
                }
              />
              {eligibility.healthyVolunteers && (
                <Field label="Healthy volunteers" value={eligibility.healthyVolunteers} />
              )}
            </dl>
            {eligibility.criteria && (
              <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 font-sans text-xs leading-5 text-foreground/90">
                {eligibility.criteria}
              </pre>
            )}
          </Card>

          <Card title="Locations">
            {locations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No specific locations listed.</p>
            ) : (
              <ul className="divide-y divide-border">
                {locations.slice(0, 25).map((l) => (
                  <li key={l.id} className="flex items-start gap-3 py-3 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">{l.facility || "Research site"}</p>
                      <p className="text-muted-foreground">
                        {[l.city, l.state, l.zip, l.country].filter(Boolean).join(", ")}
                      </p>
                      {l.status && <p className="mt-0.5 text-xs text-muted-foreground">Status: {l.status}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="space-y-5">
          <Card title="At a glance">
            <ul className="space-y-3 text-sm">
              {study.sponsor_name && (
                <SideItem icon={<Building2 className="h-4 w-4" />} label="Sponsor">
                  {study.sponsor_slug ? (
                    <Link to="/sponsors/$slug" params={{ slug: study.sponsor_slug }} className="text-primary hover:underline">
                      {study.sponsor_name}
                    </Link>
                  ) : (
                    study.sponsor_name
                  )}
                </SideItem>
              )}
              <SideItem icon={<Users className="h-4 w-4" />} label="Enrollment">
                {study.enrollment ? `${study.enrollment.toLocaleString()} participants` : "Not provided"}
              </SideItem>
              <SideItem icon={<Calendar className="h-4 w-4" />} label="Start date">
                {study.start_date ?? "—"}
              </SideItem>
              <SideItem icon={<Calendar className="h-4 w-4" />} label="Completion">
                {study.completion_date ?? "—"}
              </SideItem>
            </ul>
            <a
              href={`https://clinicaltrials.gov/study/${study.nct_id}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              View on ClinicalTrials.gov <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Card>

          {(study.conditions ?? []).length > 0 && (
            <Card title="Conditions">
              <div className="flex flex-wrap gap-1.5">
                {(study.conditions ?? []).map((c, i) => {
                  const slug = (study.condition_slugs ?? [])[i];
                  return slug ? (
                    <Link key={c} to="/conditions/$slug" params={{ slug }} className="rounded-md border border-border bg-card px-2 py-1 text-xs hover:border-primary/60">
                      {c}
                    </Link>
                  ) : (
                    <span key={c} className="rounded-md border border-border bg-card px-2 py-1 text-xs">{c}</span>
                  );
                })}
              </div>
            </Card>
          )}

          {related.length > 0 && (
            <Card title="Related studies">
              <ul className="space-y-3 text-sm">
                {related.map((r) => (
                  <li key={r.nct_id}>
                    <Link to="/studies/$nctId" params={{ nctId: r.nct_id }} className="line-clamp-2 hover:text-primary">
                      {r.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">{statusLabel(r.overall_status)} · {phaseLabel(r.phase)}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </article>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}
function SideItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 text-primary">{icon}</span>
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm">{children}</p>
      </div>
    </li>
  );
}
