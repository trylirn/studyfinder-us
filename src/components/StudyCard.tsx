import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { phaseLabel, statusLabel } from "@/lib/slug";

type Study = {
  nct_id: string;
  title: string;
  brief_summary?: string | null;
  phase?: string | null;
  overall_status?: string | null;
  sponsor_name?: string | null;
  conditions?: string[] | null;
};

export function StudyCard({ study }: { study: Study }) {
  const isRecruiting = study.overall_status === "RECRUITING";
  return (
    <Link
      to="/studies/$nctId"
      params={{ nctId: study.nct_id }}
      className="group block rounded-xl border border-border bg-card p-5 transition hover:border-primary/60 hover:shadow-md"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge
          variant="outline"
          className={isRecruiting ? "border-success/40 bg-success/10 text-success" : ""}
        >
          {statusLabel(study.overall_status)}
        </Badge>
        {study.phase && <Badge variant="secondary">{phaseLabel(study.phase)}</Badge>}
        <span className="text-muted-foreground">{study.nct_id}</span>
      </div>
      <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug group-hover:text-primary">
        {study.title}
      </h3>
      {study.brief_summary && (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{study.brief_summary}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {study.sponsor_name && <span>Sponsor: <span className="text-foreground/80">{study.sponsor_name}</span></span>}
        {study.conditions && study.conditions.length > 0 && (
          <span>Condition: <span className="text-foreground/80">{study.conditions.slice(0, 2).join(", ")}</span></span>
        )}
      </div>
    </Link>
  );
}
