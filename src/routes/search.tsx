import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { searchStudies } from "@/lib/directory.functions";
import { StudyCard } from "@/components/StudyCard";
import { SearchBar } from "@/components/SearchBar";

const searchSchema = z.object({
  q: z.string().optional(),
  condition: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  sponsor: z.string().optional(),
  phase: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
});

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Search Clinical Trials | TrialFinderUS" },
      { name: "description", content: "Search recruiting clinical trials by condition, treatment, city, state, sponsor, or NCT ID." },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const page = search.page ?? 1;
  const { data, isLoading } = useQuery({
    queryKey: ["search", search],
    queryFn: () => searchStudies({ data: search }),
  });

  const pageSize = data?.pageSize ?? 20;
  const totalPages = Math.min(50, Math.ceil((data?.total ?? 0) / pageSize));

  function setFilter(key: keyof typeof search, value: string | undefined) {
    navigate({ search: (s: typeof search) => ({ ...s, [key]: value || undefined, page: undefined }) });
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Search clinical trials</h1>
      <div className="mt-4">
        <SearchBar initial={search.q ?? ""} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <FilterSelect
          label="Status"
          value={search.status}
          onChange={(v) => setFilter("status", v)}
          options={[
            ["RECRUITING", "Recruiting"],
            ["NOT_YET_RECRUITING", "Not yet recruiting"],
            ["ACTIVE_NOT_RECRUITING", "Active, not recruiting"],
            ["COMPLETED", "Completed"],
            ["ENROLLING_BY_INVITATION", "Enrolling by invitation"],
            ["TERMINATED", "Terminated"],
          ]}
        />
        <FilterSelect
          label="Phase"
          value={search.phase}
          onChange={(v) => setFilter("phase", v)}
          options={[
            ["1", "Phase 1"],
            ["2", "Phase 2"],
            ["3", "Phase 3"],
            ["4", "Phase 4"],
          ]}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
        {!isLoading && (data?.rows ?? []).map((s) => <StudyCard key={s.nct_id} study={s} />)}
        {!isLoading && (data?.rows.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No studies match your filters. Try a broader search.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }).slice(0, 10).map((_, i) => {
            const p = i + 1;
            return (
              <Link
                key={p}
                from="/search"
                search={(s: typeof search) => ({ ...s, page: p })}
                className={`rounded-md border px-3 py-1.5 ${page === p ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/60"}`}
              >
                {p}
              </Link>
            );
          })}
        </div>
      )}
      {data && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Showing {(data.rows.length).toLocaleString()} of {data.total.toLocaleString()} matching studies
        </p>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
  options: [string, string][];
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5">
      <span className="text-muted-foreground">{label}:</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="bg-transparent outline-none"
      >
        <option value="">Any</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}

function Skeleton() {
  return <div className="h-36 animate-pulse rounded-xl border border-border bg-card" />;
}
