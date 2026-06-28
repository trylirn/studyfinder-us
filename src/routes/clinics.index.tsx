import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { listClinics, listStates } from "@/lib/directory.functions";
import { Pager } from "@/components/Pager";
import { Hospital, MapPin } from "lucide-react";

const searchSchema = z.object({
  q: z.string().optional(),
  state: z.string().optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
});

export const Route = createFileRoute("/clinics/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Clinical Research Sites & Clinics in the U.S. | TrialFinderUS" },
      { name: "description", content: "Browse clinical research sites and trial-running clinics across the United States. Find recruiting facilities near you." },
    ],
    links: [{ rel: "canonical", href: "/clinics" }],
  }),
  component: ClinicsIndex,
});

function ClinicsIndex() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const page = search.page ?? 1;
  const { data, isLoading } = useQuery({
    queryKey: ["clinics", search.q ?? "", search.state ?? "", page],
    queryFn: () => listClinics({ data: { q: search.q ?? "", state: search.state ?? "", page } }),
  });
  const { data: states } = useQuery({ queryKey: ["states", ""], queryFn: () => listStates({ data: { q: "" } }) });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
        <Hospital className="h-7 w-7 text-primary" /> Clinical Research Sites
      </h1>
      <p className="mt-2 text-muted-foreground">Browse hospitals and clinics running active clinical trials.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <input
          type="search"
          defaultValue={search.q ?? ""}
          placeholder="Search clinic name…"
          onChange={(e) => navigate({ search: (s: any) => ({ ...s, q: e.target.value || undefined, page: undefined }) })}
          className="min-w-[240px] flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <select
          value={search.state ?? ""}
          onChange={(e) => navigate({ search: (s: any) => ({ ...s, state: e.target.value || undefined, page: undefined }) })}
          className="rounded-md border border-border bg-card px-2 py-2 text-sm"
        >
          <option value="">All states</option>
          {(states ?? []).map((st: any) => (
            <option key={st.slug} value={st.abbr}>{st.name}</option>
          ))}
        </select>
      </div>

      {data && (
        <p className="mt-3 text-xs text-muted-foreground">{data.total.toLocaleString()} clinics</p>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-card" />)}
        {(data?.rows ?? []).map((c: any) => (
          <Link
            key={c.slug}
            to="/clinics/$slug"
            params={{ slug: c.slug }}
            className="rounded-lg border border-border bg-card p-4 transition hover:border-primary/60"
          >
            <p className="font-medium leading-tight">{c.name}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {[c.city, c.state].filter(Boolean).join(", ")}
            </p>
            <p className="mt-2 text-xs text-success">{c.recruiting_count} recruiting trial{c.recruiting_count === 1 ? "" : "s"}</p>
          </Link>
        ))}
        {!isLoading && (data?.rows.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No clinics match these filters yet. Run an import from /admin to populate this directory.</p>
        )}
      </div>

      {data && (
        <Pager page={page} total={data.total} pageSize={data.pageSize} onChange={(p) => navigate({ search: (s: any) => ({ ...s, page: p }) })} />
      )}
    </div>
  );
}
