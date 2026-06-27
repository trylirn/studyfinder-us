import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getHomeData } from "@/lib/directory.functions";
import { getTrendingConditions } from "@/lib/trending.functions";
import { SearchBar } from "@/components/SearchBar";
import { StudyCard } from "@/components/StudyCard";
import { Activity, FlaskConical, MapPin, Stethoscope, Building2, FileText } from "lucide-react";

const homeQuery = queryOptions({ queryKey: ["home"], queryFn: () => getHomeData() });
const trendingQuery = queryOptions({ queryKey: ["trending-conditions"], queryFn: () => getTrendingConditions() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Clinical Trials & Research Studies in the United States | TrialFinderUS" },
      {
        name: "description",
        content:
          "Search thousands of recruiting clinical trials and paid research studies across the U.S. by condition, city, state, sponsor, and phase.",
      },
      { property: "og:title", content: "TrialFinderUS — U.S. Clinical Trials Directory" },
      { property: "og:description", content: "Find recruiting clinical trials across the United States." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(homeQuery),
      context.queryClient.ensureQueryData(trendingQuery),
    ]),
  component: HomePage,
});

function HomePage() {
  const { data } = useSuspenseQuery(homeQuery);
  const { data: trending } = useSuspenseQuery(trendingQuery);
  return (
    <div>
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-accent/40 via-background to-background">
        <div className="container mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-primary" /> Updated daily from ClinicalTrials.gov
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Find a clinical trial that fits your life.
            </h1>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Browse {data.totalStudies.toLocaleString()} studies in the United States, including{" "}
              <span className="font-medium text-success">{data.totalRecruiting.toLocaleString()} recruiting now</span>.
              Search by condition, city, sponsor, or phase.
            </p>
            <div className="mx-auto mt-7 max-w-2xl">
              <SearchBar large />
            </div>
            {trending.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <span>Trending:</span>
                {trending.map((t) => (
                  <Link
                    key={t.slug}
                    to="/conditions/$slug"
                    params={{ slug: t.slug }}
                    className="underline-offset-4 hover:text-primary hover:underline"
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <Section icon={<Stethoscope className="h-5 w-5" />} title="Browse by condition" cta={{ label: "All conditions", to: "/conditions" }}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {data.topConditions.slice(0, 18).map((c) => (
            <Link
              key={c.slug}
              to="/conditions/$slug"
              params={{ slug: c.slug }}
              className="rounded-lg border border-border bg-card p-3 transition hover:border-primary/60"
            >
              <p className="text-sm font-medium leading-tight">{c.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.study_count.toLocaleString()} studies</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section icon={<MapPin className="h-5 w-5" />} title="Browse by state" cta={{ label: "All states", to: "/states" }}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {data.topStates.map((s) => (
            <Link
              key={s.slug}
              to="/states/$stateSlug"
              params={{ stateSlug: s.slug }}
              className="rounded-lg border border-border bg-card p-3 hover:border-primary/60"
            >
              <p className="text-sm font-medium">{s.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.study_count.toLocaleString()} studies</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section icon={<FlaskConical className="h-5 w-5" />} title="Recently updated studies" cta={{ label: "Search all", to: "/search" }}>
        <div className="grid gap-4 md:grid-cols-2">
          {data.recent.map((s) => (
            <StudyCard key={s.nct_id} study={s} />
          ))}
        </div>
      </Section>

      <Section icon={<Building2 className="h-5 w-5" />} title="Top sponsors" cta={{ label: "All sponsors", to: "/sponsors" }}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {data.topSponsors.map((s) => (
            <Link
              key={s.slug}
              to="/sponsors/$slug"
              params={{ slug: s.slug }}
              className="rounded-lg border border-border bg-card p-3 hover:border-primary/60"
            >
              <p className="line-clamp-1 text-sm font-medium">{s.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.study_count.toLocaleString()} studies</p>
            </Link>
          ))}
        </div>
      </Section>

      <section className="container mx-auto px-4 pb-20 pt-6">
        <div className="rounded-2xl border border-border bg-accent/30 p-6 md:p-10">
          <div className="flex items-start gap-3">
            <FileText className="mt-1 h-5 w-5 text-primary" />
            <div>
              <h2 className="text-xl font-semibold tracking-tight">New to clinical trials?</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Learn how clinical trials work, what each phase means, and the questions to ask before enrolling.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <Link to="/learn/$slug" params={{ slug: "what-are-clinical-trials" }} className="rounded-md border border-border bg-card px-3 py-1.5 hover:border-primary/60">What are clinical trials?</Link>
                <Link to="/learn/$slug" params={{ slug: "phases-explained" }} className="rounded-md border border-border bg-card px-3 py-1.5 hover:border-primary/60">Phases explained</Link>
                <Link to="/learn/$slug" params={{ slug: "how-to-participate" }} className="rounded-md border border-border bg-card px-3 py-1.5 hover:border-primary/60">How to participate</Link>
                <Link to="/learn/$slug" params={{ slug: "risks-and-benefits" }} className="rounded-md border border-border bg-card px-3 py-1.5 hover:border-primary/60">Risks &amp; benefits</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Section({
  icon,
  title,
  cta,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  cta?: { label: string; to: string };
  children: React.ReactNode;
}) {
  return (
    <section className="container mx-auto px-4 pt-12">
      <div className="mb-4 flex items-end justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <span className="text-primary">{icon}</span>
          {title}
        </h2>
        {cta && (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Link to={cta.to as any} className="text-sm text-primary hover:underline">
            {cta.label} →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
