import { useQuery } from "@tanstack/react-query";
import { getAnalyticsDetail } from "@/lib/analytics.functions";
import { Bars, DataTable, KpiCard, Panel } from "./AnalyticsBits";
import { LEAD_LABELS, num, pct } from "./range";

export function DetailPanel({
  dim,
  entityKey,
  label,
  from,
  to,
  onClose,
}: {
  dim: "city" | "state" | "clinic" | "condition";
  entityKey: string;
  label: string;
  from: string;
  to: string;
  onClose: () => void;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics-detail", dim, entityKey, from, to],
    queryFn: () => getAnalyticsDetail({ data: { dim, key: entityKey, from, to } }),
  });

  return (
    <div className="mt-4 rounded-xl border border-primary/40 bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{dim} detail</div>
          <h3 className="text-base font-semibold text-foreground">{label}</h3>
        </div>
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
          Close
        </button>
      </div>

      {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="py-6 text-center text-sm text-destructive">{(error as Error).message}</p>}

      {data && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard label="Impressions" value={data.totals.impressions} />
            <KpiCard label="Clicks" value={data.totals.clicks} />
            <KpiCard label="Click rate" value={pct(data.totals.clicks, data.totals.impressions)} />
            <KpiCard label="Lead actions" value={data.totals.lead_actions} />
            <KpiCard label="Unique leads" value={data.totals.unique_leads} />
            <KpiCard label="Visitors" value={data.totals.visitors} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Lead actions">
              <Bars
                items={data.leadBreakdown
                  .filter((l) => l.count > 0)
                  .map((l) => ({ label: `${LEAD_LABELS[l.action] ?? l.action} (${num(l.people)} people)`, value: l.count }))}
              />
            </Panel>
            <Panel title="Top providers">
              <DataTable
                columns={[
                  { key: "label", label: "Provider" },
                  { key: "impressions", label: "Impr.", align: "right" },
                  { key: "clicks", label: "Clicks", align: "right" },
                  { key: "lead_actions", label: "Leads", align: "right" },
                ]}
                rows={data.topClinics}
              />
            </Panel>
            <Panel title="Top conditions">
              <DataTable
                columns={[
                  { key: "label", label: "Condition" },
                  { key: "clicks", label: "Clicks", align: "right" },
                  { key: "lead_actions", label: "Leads", align: "right" },
                ]}
                rows={data.topConditions}
              />
            </Panel>
            <Panel title="Recent searches here">
              {data.recentQueries.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No searches recorded.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {data.recentQueries.map((q) => (
                    <li key={q} className="rounded-full border border-border px-3 py-1 text-xs text-foreground">
                      {q}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
