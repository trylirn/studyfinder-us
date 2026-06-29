import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { getStudy } from "@/lib/directory.functions";
import { Badge } from "@/components/ui/badge";
import { phaseLabel, statusLabel } from "@/lib/slug";
import { Building2, Calendar, Users, ExternalLink, ClipboardCheck, FlaskConical, Hospital } from "lucide-react";
import { EligibilityModal } from "@/components/EligibilityModal";
import { AiSimplify } from "@/components/AiSimplify";
import { LocationsList } from "@/components/LocationsList";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { TrialMap } from "@/components/TrialMap";

const studyQuery = (nctId: string) =>
  queryOptions({
    queryKey: ["study", nctId],
    queryFn: () => getStudy({ data: { nctId } }),
  });

function isPhaseShown(phase?: string | null): phase is string {
  if (!phase) return false;
  const p = phase.toUpperCase();
  if (p === "NA" || p === "N/A" || p === "NOT_APPLICABLE" || p === "NOT APPLICABLE") return false;
  return p.includes("PHASE");
}

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
  const [modalOpen, setModalOpen] = useState(false);
  if (!data) return null;
  const { study, locations, related } = data;
  const clinicMap = (data as { clinicMap?: Record<string, { slug: string; name: string }> }).clinicMap ?? {};
  const mapPins = (locations as Array<{ id: number | string; lat: number | null; lng: number | null; facility: string | null; city: string | null; state: string | null; status: string | null; clinic_id: string | null }>)
    .filter((l): l is typeof l & { lat: number; lng: number } => typeof l.lat === "number" && typeof l.lng === "number")
    .map((l) => ({
      id: l.id,
      lat: l.lat,
      lng: l.lng,
      facility: l.facility,
      city: l.city,
      state: l.state,
      status: l.status,
      clinicSlug: l.clinic_id ? clinicMap[l.clinic_id]?.slug ?? null : null,
    }));
  const isRecruiting = study.overall_status === "RECRUITING";
  const showPhase = isPhaseShown(study.phase);
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

      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className={isRecruiting ? "border-success/40 bg-success/10 text-success" : ""}>
          {statusLabel(study.overall_status)}
        </Badge>
        {showPhase && <Badge variant="secondary">{phaseLabel(study.phase)}</Badge>}
        {study.study_type && <Badge variant="outline">{study.study_type}</Badge>}
        <span className="text-muted-foreground">{study.nct_id}</span>
      </div>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">{study.title}</h1>

      {/* High-contrast CTA */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          <ClipboardCheck className="h-4 w-4" />
          Check My Eligibility
        </button>
        <a
          href={`https://clinicaltrials.gov/study/${study.nct_id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          View on ClinicalTrials.gov <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Sponsor vs Research Sites — clearly separated */}
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" /> Sponsor (funding institution)
          </p>
          <p className="mt-2 text-sm">
            {study.sponsor_slug && study.sponsor_name ? (
              <Link to="/sponsors/$slug" params={{ slug: study.sponsor_slug }} className="font-medium text-primary hover:underline">
                {study.sponsor_name}
              </Link>
            ) : (
              <span className="font-medium">{study.sponsor_name ?? "Not provided"}</span>
            )}
          </p>
          {study.collaborators && study.collaborators.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Collaborators: {study.collaborators.slice(0, 3).join(", ")}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Hospital className="h-3.5 w-3.5" /> Research sites (where patients go)
          </p>
          <p className="mt-2 text-sm">
            <span className="font-medium">{locations.length}</span> physical clinic{locations.length === 1 ? "" : "s"} listed
            {locations.length > 0 && (
              <a href="#research-locations" className="ml-2 text-xs text-primary hover:underline">See list ↓</a>
            )}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          {study.brief_summary && (
            <Card title="Brief summary">
              <p className="whitespace-pre-line text-sm leading-6 text-foreground/90">{study.brief_summary}</p>
              <AiSimplify nctId={study.nct_id} section="summary" text={study.brief_summary} />
            </Card>
          )}
          {study.detailed_description && (
            <Card title="Detailed description">
              <p className="whitespace-pre-line text-sm leading-6 text-foreground/90">{study.detailed_description}</p>
              <AiSimplify nctId={study.nct_id} section="description" text={study.detailed_description} />
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
              <>
                <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 font-sans text-xs leading-5 text-foreground/90">
                  {eligibility.criteria}
                </pre>
                <AiSimplify nctId={study.nct_id} section="eligibility" text={eligibility.criteria} />
              </>
            )}
          </Card>

          <section id="research-locations" className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Hospital className="h-4 w-4" /> Research locations
            </h2>
            {mapPins.length > 0 && (
              <div className="mb-4">
                <TrialMap pins={mapPins} height={320} />
              </div>
            )}
            <LocationsList locations={locations} />
          </section>

          <LegalDisclaimer />
        </div>

        <aside className="space-y-5">
          <Card title="At a glance">
            <ul className="space-y-3 text-sm">
              <SideItem icon={<Users className="h-4 w-4" />} label="Enrollment">
                {study.enrollment ? `${study.enrollment.toLocaleString()} participants` : "Not provided"}
              </SideItem>
              <SideItem icon={<Calendar className="h-4 w-4" />} label="Start date">
                {study.start_date ?? "—"}
              </SideItem>
              <SideItem icon={<Calendar className="h-4 w-4" />} label="Completion">
                {study.completion_date ?? "—"}
              </SideItem>
              <SideItem icon={<FlaskConical className="h-4 w-4" />} label="Study type">
                {study.study_type ?? "—"}
              </SideItem>
            </ul>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              <ClipboardCheck className="h-4 w-4" /> Check eligibility
            </button>
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
                    <p className="mt-0.5 text-xs text-muted-foreground">{statusLabel(r.overall_status)}{isPhaseShown(r.phase) ? ` · ${phaseLabel(r.phase)}` : ""}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>

      <EligibilityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        nctId={study.nct_id}
        trialTitle={study.title}
        conditions={study.conditions ?? []}
        eligibilitySnippet={eligibility.criteria}
      />
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
