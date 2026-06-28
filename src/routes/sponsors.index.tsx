import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { listSponsors } from "@/lib/directory.functions";
import { Pager } from "@/components/Pager";

const searchSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
});

export const Route = createFileRoute("/sponsors/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Top Clinical Trial Sponsors | TrialFinderUS" },
      { name: "description", content: "Browse clinical trials by sponsor — pharma, biotech, NIH, and academic medical centers." },
    ],
    links: [{ rel: "canonical", href: "/sponsors" }],
  }),
  component: SponsorsIndex,
});

function SponsorsIndex() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const page = search.page ?? 1;
  const { data, isLoading } = useQuery({
    queryKey: ["sponsors", search.q ?? "", page],
    queryFn: () => listSponsors({ data: { q: search.q ?? "", page } }),
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Clinical Trial Sponsors</h1>
      <input
        type="search"
        defaultValue={search.q ?? ""}
        placeholder="Search sponsors (e.g. Pfizer, NIH, Mayo Clinic)…"
        onChange={(e) => navigate({ search: { q: e.target.value || undefined, page: undefined } })}
        className="mt-5 w-full max-w-md rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
      />
      {data && (
        <p className="mt-3 text-xs text-muted-foreground">
          {data.total.toLocaleString()} sponsors{search.q ? ` matching "${search.q}"` : ""}
        </p>
      )}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
        {isLoading && Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-md border border-border bg-card" />)}
        {(data?.rows ?? []).map((s: { slug: string; name: string; study_count: number }) => (
          <Link key={s.slug} to="/sponsors/$slug" params={{ slug: s.slug }} className="rounded-md border border-border bg-card p-3 hover:border-primary/60">
            <p className="text-sm font-medium">{s.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.study_count.toLocaleString()} studies</p>
          </Link>
        ))}
        {!isLoading && (data?.rows.length ?? 0) === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">No sponsors match that search.</p>
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
