import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listRecruiting } from "@/lib/directory.functions";
import { StudyCard } from "@/components/StudyCard";

const q = queryOptions({ queryKey: ["recruiting"], queryFn: () => listRecruiting() });

export const Route = createFileRoute("/recruiting")({
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  head: () => ({
    meta: [
      { title: "Recruiting Clinical Trials in the U.S. | TrialFinderUS" },
      { name: "description", content: "Currently recruiting clinical trials and open-enrollment research studies across the United States." },
    ],
    links: [{ rel: "canonical", href: "/recruiting" }],
  }),
  component: () => {
    const { data } = useSuspenseQuery(q);
    return (
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Currently Recruiting Studies</h1>
        <p className="mt-2 text-muted-foreground">{data.total.toLocaleString()} recruiting studies in the United States.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {data.studies.map((s) => <StudyCard key={s.nct_id} study={s} />)}
        </div>
      </div>
    );
  },
});
