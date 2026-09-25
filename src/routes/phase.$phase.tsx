import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getPhasePage } from "@/lib/directory.functions";
import { StudyCard } from "@/components/StudyCard";

const q = (phase: "1" | "2" | "3" | "4") =>
  queryOptions({ queryKey: ["phase", phase], queryFn: () => getPhasePage({ data: { phase } }) });

export const Route = createFileRoute("/phase/$phase")({
  parseParams: (p) => ({ phase: p.phase as "1" | "2" | "3" | "4" }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(q(params.phase)),
  head: ({ params }) => {
    const title = `Phase ${params.phase} Clinical Trials in the U.S. | TrialFinderUS`;
    const description = `Browse Phase ${params.phase} clinical trials and research studies recruiting across the United States.`;
    const url = `https://studyfinder-us.lovable.app/phase/${params.phase}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: () => {
    const { phase } = Route.useParams();
    const { data } = useSuspenseQuery(q(phase as "1" | "2" | "3" | "4"));
    return (
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Phase {phase} Clinical Trials</h1>
        <p className="mt-2 text-muted-foreground">{data.total.toLocaleString()} Phase {phase} studies across the United States.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {data.studies.map((s) => <StudyCard key={s.nct_id} study={s} source="phase_page" />)}
        </div>
      </div>
    );
  },
});
