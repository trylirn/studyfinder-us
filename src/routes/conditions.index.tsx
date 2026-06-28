import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { listConditions } from "@/lib/directory.functions";
import { Pager } from "@/components/Pager";

const searchSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
});

export const Route = createFileRoute("/conditions/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "All Conditions — Clinical Trials Directory | TrialFinderUS" },
      { name: "description", content: "Browse clinical trials by medical condition. From diabetes and cancer to rare diseases." },
    ],
    links: [{ rel: "canonical", href: "/conditions" }],
  }),
  component: ConditionsIndex,
});

function ConditionsIndex() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const page = search.page ?? 1;
  const { data, isLoading } = useQuery({
    queryKey: ["conditions", search.q ?? "", page],
    queryFn: () => listConditions({ data: { q: search.q ?? "", page } }),
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Conditions</h1>
      <p className="mt-2 text-muted-foreground">Find clinical trials by condition.</p>
      <input
        type="search"
        defaultValue={search.q ?? ""}
        placeholder="Search conditions (e.g. diabetes, lung cancer)…"
        onChange={(e) => navigate({ search: { q: e.target.value || undefined, page: undefined } })}
        className="mt-5 w-full max-w-md rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
      />
      {data && (
        <p className="mt-3 text-xs text-muted-foreground">
          {data.total.toLocaleString()} conditions{search.q ? ` matching "${search.q}"` : ""}
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {isLoading && Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-md border border-border bg-card" />)}
        {(data?.rows ?? []).map((c: { slug: string; name: string; study_count: number }) => (
          <Link key={c.slug} to="/conditions/$slug" params={{ slug: c.slug }} className="rounded-md border border-border bg-card p-3 hover:border-primary/60">
            <p className="text-sm font-medium">{c.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{c.study_count.toLocaleString()} studies</p>
          </Link>
        ))}
        {!isLoading && (data?.rows.length ?? 0) === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">No conditions match that search.</p>
        )}
      </div>
      {data && (
        <Pager
          page={page}
          total={data.total}
          pageSize={data.pageSize}
          onChange={(p) => navigate({ search: (s) => ({ ...s, page: p }) })}
        />
      )}
    </div>
  );
}
