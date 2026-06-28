import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { listRecruiting, listStates } from "@/lib/directory.functions";
import { StudyCard } from "@/components/StudyCard";
import { Pager } from "@/components/Pager";

const searchSchema = z.object({
  q: z.string().optional(),
  state: z.string().optional(),
  phase: z.string().optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
});

export const Route = createFileRoute("/recruiting")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Recruiting Clinical Trials in the U.S. | TrialFinderUS" },
      { name: "description", content: "Currently recruiting clinical trials and open-enrollment research studies across the United States." },
    ],
    links: [{ rel: "canonical", href: "/recruiting" }],
  }),
  component: RecruitingPage,
});

function RecruitingPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const page = search.page ?? 1;
  const { data, isLoading } = useQuery({
    queryKey: ["recruiting", search],
    queryFn: () =>
      listRecruiting({
        data: { q: search.q ?? "", state: search.state ?? "", phase: search.phase ?? "", page },
      }),
  });
  const { data: states } = useQuery({ queryKey: ["states", ""], queryFn: () => listStates({ data: { q: "" } }) });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Currently Recruiting Studies</h1>
      <p className="mt-2 text-muted-foreground">{data?.total?.toLocaleString() ?? "—"} recruiting studies in the United States.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <input
          type="search"
          defaultValue={search.q ?? ""}
          placeholder="Search by condition, treatment, or keyword…"
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
            <option key={st.slug} value={st.slug}>{st.name}</option>
          ))}
        </select>
        <select
          value={search.phase ?? ""}
          onChange={(e) => navigate({ search: (s: any) => ({ ...s, phase: e.target.value || undefined, page: undefined }) })}
          className="rounded-md border border-border bg-card px-2 py-2 text-sm"
        >
          <option value="">All phases</option>
          <option value="1">Phase 1</option>
          <option value="2">Phase 2</option>
          <option value="3">Phase 3</option>
          <option value="4">Phase 4</option>
        </select>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-xl border border-border bg-card" />)}
        {!isLoading && (data?.studies ?? []).map((s: any) => <StudyCard key={s.nct_id} study={s} />)}
        {!isLoading && (data?.studies.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No recruiting studies match these filters.</p>
        )}
      </div>

      {data && (
        <Pager
          page={page}
          total={data.total}
          pageSize={data.pageSize}
          onChange={(p) => navigate({ search: (s: any) => ({ ...s, page: p }) })}
        />
      )}
    </div>
  );
}
