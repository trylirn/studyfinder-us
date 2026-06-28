import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { listStates } from "@/lib/directory.functions";

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/states/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Clinical Trials by State — All 50 U.S. States | TrialFinderUS" },
      { name: "description", content: "Browse clinical trials and research studies in every U.S. state." },
    ],
    links: [{ rel: "canonical", href: "/states" }],
  }),
  component: StatesIndex,
});

function StatesIndex() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data } = useQuery({
    queryKey: ["states", search.q ?? ""],
    queryFn: () => listStates({ data: { q: search.q ?? "" } }),
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Clinical Trials by State</h1>
      <input
        type="search"
        defaultValue={search.q ?? ""}
        placeholder="Filter states by name…"
        onChange={(e) => navigate({ search: { q: e.target.value || undefined } })}
        className="mt-5 w-full max-w-md rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {(data ?? []).map((s: { slug: string; name: string; abbr: string; study_count: number }) => (
          <Link key={s.slug} to="/states/$stateSlug" params={{ stateSlug: s.slug }} className="rounded-md border border-border bg-card p-3 hover:border-primary/60">
            <p className="text-sm font-medium">{s.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.study_count.toLocaleString()} studies</p>
          </Link>
        ))}
        {data && data.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">No states match that filter.</p>
        )}
      </div>
    </div>
  );
}
