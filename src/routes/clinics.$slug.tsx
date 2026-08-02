import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getClinicPage } from "@/lib/directory.functions";
import { StudyCard } from "@/components/StudyCard";
import { TrialMap } from "@/components/TrialMap";
import { Hospital, MapPin, Building2, Phone, Globe, Navigation, Stethoscope, FlaskConical } from "lucide-react";
import { track } from "@/lib/track";

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
    const loc = [c?.city, c?.state].filter(Boolean).join(", ");
    const title = `${name} — Clinical Research Site | TrialFinderUS`;
    const desc = `${name}${loc ? ` in ${loc}` : ""}. Active recruiting clinical trials and contact information.`;
    const url = `https://studyfinder-us.lovable.app/clinics/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
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
  const [statusFilter, setStatusFilter] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("");
  const availableStatuses = useMemo(
    () => Array.from(new Set(trials.map((t) => t.overall_status).filter(Boolean))).sort(),
    [trials],
  );
  const availablePhases = useMemo(
    () => Array.from(new Set(trials.flatMap((t) => (Array.isArray(t.phase) ? t.phase : [t.phase])).filter(Boolean))).sort(),
    [trials],
  );
  const filteredTrials = useMemo(
    () =>
      trials.filter((t) => {
        if (statusFilter && t.overall_status !== statusFilter) return false;
        if (phaseFilter) {
          const phases = Array.isArray(t.phase) ? t.phase : t.phase ? [t.phase] : [];
          if (!phases.includes(phaseFilter)) return false;
        }
        return true;
      }),
    [trials, statusFilter, phaseFilter],
  );
  const formatStatus = (s: string) =>
    s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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
  const leadContext = {
    clinic_id: clinic.id,
    city_slug: clinic.city_slug ?? null,
    state_slug: clinic.state_slug ?? null,
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
            to="/clinics/auth"
            search={{ mode: "signup", next: `/portal/claim?clinic=${clinic.slug}` }}
            className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
          >
            Claim this clinic
          </Link>
        )}
      </div>

      {/* Quick contact */}
      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {clinic.phone && (
          <a href={`tel:${clinic.phone}`} onClick={() => track("lead_call", leadContext)} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm hover:border-primary/60">
            <Phone className="h-4 w-4 text-primary" /> {clinic.phone}
          </a>
        )}
        {clinic.website && /^https?:\/\//i.test(clinic.website) && (
          <a href={clinic.website} target="_blank" rel="noopener noreferrer" onClick={() => track("lead_website", leadContext)} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm hover:border-primary/60">
            <Globe className="h-4 w-4 text-primary" /> <span className="truncate">Website</span>
          </a>
        )}

        {(clinic.lat && clinic.lng) || clinic.address_line1 ? (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([clinic.name, clinic.address_line1, clinic.city, clinic.state, clinic.zip].filter(Boolean).join(", "))}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("lead_directions", leadContext)}
            className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm hover:border-primary/60"
          >
            <Navigation className="h-4 w-4 text-primary" /> Get directions
          </a>
        ) : null}
      </section>

      {/* Map */}
      {clinic.lat && clinic.lng && (
        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-4 w-4" /> Location
          </h2>
          <TrialMap
            pins={[{ id: clinic.id, lat: clinic.lat, lng: clinic.lng, facility: clinic.name, city: clinic.city, state: clinic.state, status: null, clinicSlug: clinic.slug }]}
            height={320}
          />
        </section>
      )}

      {clinic.description && (
        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Building2 className="h-4 w-4" /> About
          </h2>
          <p className="whitespace-pre-line text-sm leading-6">{clinic.description}</p>
        </section>
      )}

      {(clinic.specialties ?? []).length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Stethoscope className="h-4 w-4" /> Specialties
          </h2>
          <div className="flex flex-wrap gap-2">
            {(clinic.specialties ?? []).map((s: string) => (
              <span key={s} className="rounded-full border border-border bg-card px-3 py-1 text-xs">{s}</span>
            ))}
          </div>
        </section>
      )}

      {(data.topConditions ?? []).length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FlaskConical className="h-5 w-5 text-primary" /> Conditions studied here
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.topConditions.map((c: any) => (
              <Link
                key={c.slug}
                to="/conditions/$slug"
                params={{ slug: c.slug }}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:border-primary/60"
              >
                {c.name} <span className="text-muted-foreground">· {c.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Trials currently recruiting here</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <select
              aria-label="Filter trials by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-border bg-card px-2 py-1.5"
            >
              <option value="">All statuses</option>
              {availableStatuses.map((s) => (
                <option key={s} value={s}>{formatStatus(s)}</option>
              ))}
            </select>
            <select
              aria-label="Filter trials by phase"
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
              className="rounded-md border border-border bg-card px-2 py-1.5"
            >
              <option value="">All phases</option>
              {availablePhases.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        {(statusFilter || phaseFilter) && (
          <p className="mt-2 text-xs text-muted-foreground">
            Showing {filteredTrials.length} of {trials.length} trials
            {(statusFilter || phaseFilter) && (
              <button
                onClick={() => { setStatusFilter(""); setPhaseFilter(""); }}
                className="ml-2 text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </p>
        )}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {filteredTrials.length > 0 ? (
            filteredTrials.map((s) => <StudyCard key={s.nct_id} study={s} source="clinic_profile" />)
          ) : (
            <p className="text-sm text-muted-foreground">
              {trials.length === 0 ? "No active trials linked to this site yet." : "No trials match these filters."}
            </p>
          )}
        </div>
      </section>

      {(data.nearby ?? []).length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Other research sites nearby</h2>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {data.nearby.map((n: any) => (
              <li key={n.slug} className="rounded-lg border border-border bg-card p-3 text-sm">
                <Link to="/clinics/$slug" params={{ slug: n.slug }} className="font-medium hover:text-primary">{n.name}</Link>
                <p className="text-xs text-muted-foreground">{[n.city, n.state].filter(Boolean).join(", ")} · {n.distance_mi.toFixed(1)} mi · {n.recruiting_count} recruiting</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
