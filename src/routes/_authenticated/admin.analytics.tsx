import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  getAnalyticsBreakdown,
  getAnalyticsJourneys,
  getAnalyticsOverview,
} from "@/lib/analytics.functions";
import { Bars, DataTable, KpiCard, Panel } from "@/components/analytics/AnalyticsBits";
import { DetailPanel } from "@/components/analytics/DetailPanel";
import {
  buildRange,
  EVENT_LABELS,
  LEAD_LABELS,
  num,
  pct,
  RANGE_OPTIONS,
  type RangeKey,
} from "@/components/analytics/range";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — TrialFinderUS Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AnalyticsPage,
});

type Tab = "overview" | "cities" | "clinics" | "conditions" | "journeys";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "cities", label: "Cities & states" },
  { key: "clinics", label: "Clinics" },
  { key: "conditions", label: "Conditions" },
  { key: "journeys", label: "User journeys" },
];

function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [rangeKey, setRangeKey] = useState<RangeKey>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [detail, setDetail] = useState<
    { dim: "city" | "state" | "clinic" | "condition"; key: string; label: string } | null
  >(null);

  const range = useMemo(
    () => buildRange(rangeKey, customFrom || undefined, customTo || undefined),
    [rangeKey, customFrom, customTo],
  );

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Directory analytics</h1>
          <p className="text-sm text-muted-foreground">
            How visitors search, compare and contact providers on the directory.
          </p>
        </div>
        <Link to="/admin" className="text-sm text-primary hover:underline">
          ← Back to admin
        </Link>
      </div>

      {/* Range picker */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {RANGE_OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => setRangeKey(o.key)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              rangeKey === o.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-accent"
            }`}
          >
            {o.label}
          </button>
        ))}
        {rangeKey === "custom" && (
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              aria-label="Custom range start date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              aria-label="Custom range end date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1"
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-5 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setDetail(null);
            }}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
              tab === t.key
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "overview" && <OverviewTab from={range.from} to={range.to} />}
        {tab === "cities" && (
          <GeoTab from={range.from} to={range.to} detail={detail} setDetail={setDetail} />
        )}
        {tab === "clinics" && (
          <DimensionTab
            dim="clinic"
            title="Providers"
            from={range.from}
            to={range.to}
            detail={detail}
            setDetail={setDetail}
          />
        )}
        {tab === "conditions" && (
          <DimensionTab
            dim="condition"
            title="Conditions"
            from={range.from}
            to={range.to}
            detail={detail}
            setDetail={setDetail}
          />
        )}
        {tab === "journeys" && <JourneysTab from={range.from} to={range.to} />}
      </div>
    </div>
  );
}

function useOverview(from: string, to: string) {
  return useQuery({
    queryKey: ["analytics-overview", from, to],
    queryFn: () => getAnalyticsOverview({ data: { from, to } }),
    refetchInterval: 60_000,
  });
}

function OverviewTab({ from, to }: { from: string; to: string }) {
  const { data, isLoading, error } = useOverview(from, to);
  if (isLoading) return <p className="py-10 text-center text-sm text-muted-foreground">Loading analytics…</p>;
  if (error) return <p className="py-10 text-center text-sm text-destructive">{(error as Error).message}</p>;
  if (!data) return null;

  const o = data.overview as any;
  const p = data.previous as any;
  const series = (data.series as any[]).map((s) => ({
    ...s,
    label: new Date(s.bucket).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      ...(data.bucket === "hour" ? { hour: "numeric" } : {}),
    }),
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Searches" value={Number(o.searches)} previous={Number(p.searches)} />
        <KpiCard label="Impressions" value={Number(o.impressions)} previous={Number(p.impressions)} />
        <KpiCard label="Listing clicks" value={Number(o.clicks)} previous={Number(p.clicks)} />
        <KpiCard
          label="Click rate"
          value={pct(Number(o.clicks), Number(o.impressions))}
          hint="Clicks ÷ impressions"
        />
        <KpiCard label="Lead actions" value={Number(o.lead_actions)} previous={Number(p.lead_actions)} />
        <KpiCard
          label="Unique leads"
          value={Number(o.unique_leads)}
          previous={Number(p.unique_leads)}
        />
        <KpiCard label="Visitors" value={Number(o.visitors)} previous={Number(p.visitors)} />
        <KpiCard
          label="Mobile users"
          value={pct(Number(o.mobile_visitors), Number(o.visitors))}
          hint={`${num(o.mobile_visitors)} of ${num(o.visitors)} visitors`}
        />
      </div>

      <Panel title="Activity over time" description="Impressions, clicks and lead actions across the period.">
        {series.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} allowDecimals={false} />
                <RTooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--foreground)",
                  }}
                />
                <Line type="monotone" dataKey="impressions" stroke="var(--muted-foreground)" dot={false} />
                <Line type="monotone" dataKey="clicks" stroke="var(--primary)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="lead_actions" stroke="var(--destructive)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Lead actions breakdown" description="High-intent actions and how many distinct people took them.">
          <DataTable
            columns={[
              { key: "label", label: "Action" },
              { key: "count", label: "Actions", align: "right" },
              { key: "people", label: "People", align: "right" },
            ]}
            rows={(o.lead_breakdown as any[]).map((l) => ({
              key: l.action,
              label: LEAD_LABELS[l.action] ?? l.action,
              count: Number(l.count),
              people: Number(l.people),
            }))}
          />
        </Panel>

        <Panel title="How users discover listings" description="Where the click into a listing came from.">
          <Bars items={(o.discovery as any[]).map((d) => ({ label: d.source, value: Number(d.count) }))} />
        </Panel>

        <Panel title="Top cities by demand" description="Where traffic is concentrated.">
          <DataTable
            columns={[
              { key: "label", label: "City" },
              { key: "searches", label: "Searches", align: "right" },
              { key: "clicks", label: "Clicks", align: "right" },
              { key: "lead_actions", label: "Leads", align: "right" },
            ]}
            rows={data.cities as any[]}
          />
        </Panel>

        <Panel title="Top clinics by clicks">
          <DataTable
            columns={[
              { key: "label", label: "Provider" },
              { key: "clicks", label: "Clicks", align: "right" },
              { key: "lead_actions", label: "Leads", align: "right" },
            ]}
            rows={[...(data.clinics as any[])].sort((a, b) => Number(b.clicks) - Number(a.clicks))}
          />
        </Panel>
      </div>

      <Panel title="Live action feed" description="Most recent visitor actions, refreshing automatically.">
        <ul className="space-y-2">
          {(data.feed as any[]).length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">Nothing yet.</li>
          )}
          {(data.feed as any[]).map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline gap-2 border-b border-border/60 pb-2 text-sm last:border-0">
              <span className="text-xs tabular-nums text-muted-foreground">
                {new Date(e.occurred_at).toLocaleTimeString()}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {e.is_mobile ? "mobile" : "desktop"}
              </span>
              <span className="text-foreground">
                Visitor {String(e.visitor ?? "?").slice(0, 6)} {EVENT_LABELS[e.event_type] ?? e.event_type}
                {e.query ? ` “${e.query}”` : ""}
                {e.clinic_name ? ` — ${e.clinic_name}` : e.nct_id ? ` — ${e.nct_id}` : ""}
                {e.city_slug ? ` (${e.city_slug})` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function GeoTab({
  from,
  to,
  detail,
  setDetail,
}: {
  from: string;
  to: string;
  detail: { dim: any; key: string; label: string } | null;
  setDetail: (d: any) => void;
}) {
  const cities = useQuery({
    queryKey: ["analytics-breakdown", "city", from, to],
    queryFn: () => getAnalyticsBreakdown({ data: { dim: "city", from, to, limit: 50 } }),
  });
  const states = useQuery({
    queryKey: ["analytics-breakdown", "state", from, to],
    queryFn: () => getAnalyticsBreakdown({ data: { dim: "state", from, to, limit: 50 } }),
  });

  const cityRows = (cities.data as any[]) ?? [];
  const inDirectory = cityRows.filter((c) => c.in_directory);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top cities by impressions">
          <Bars
            items={[...cityRows]
              .sort((a, b) => Number(b.impressions) - Number(a.impressions))
              .slice(0, 10)
              .map((c) => ({ label: c.label, value: Number(c.impressions) }))}
          />
        </Panel>
        <Panel title="Top cities by lead actions">
          <Bars
            items={[...cityRows]
              .sort((a, b) => Number(b.lead_actions) - Number(a.lead_actions))
              .slice(0, 10)
              .map((c) => ({ label: c.label, value: Number(c.lead_actions) }))}
          />
        </Panel>
      </div>

      <Panel title="City activity overview" description="Click a city for a full breakdown.">
        <DataTable
          columns={[
            { key: "label", label: "City" },
            { key: "searches", label: "Searches", align: "right" },
            { key: "impressions", label: "Impressions", align: "right" },
            { key: "clicks", label: "Clicks", align: "right" },
            { key: "lead_actions", label: "Leads", align: "right" },
            { key: "visitors", label: "Visitors", align: "right" },
          ]}
          rows={cityRows}
          onRowClick={(r) => setDetail({ dim: "city", key: r.key, label: r.label })}
        />
      </Panel>

      <Panel title="Searched cities on the directory" description="Only cities that exist in the directory.">
        <DataTable
          columns={[
            { key: "label", label: "City" },
            { key: "searches", label: "Searches", align: "right" },
            { key: "clicks", label: "Clicks", align: "right" },
          ]}
          rows={[...inDirectory].sort((a, b) => Number(b.searches) - Number(a.searches)).slice(0, 25)}
          onRowClick={(r) => setDetail({ dim: "city", key: r.key, label: r.label })}
        />
      </Panel>

      <Panel title="State roll-up" description="Click a state for a full breakdown.">
        <DataTable
          columns={[
            { key: "label", label: "State" },
            { key: "impressions", label: "Impressions", align: "right" },
            { key: "clicks", label: "Clicks", align: "right" },
            { key: "lead_actions", label: "Leads", align: "right" },
            { key: "visitors", label: "Visitors", align: "right" },
          ]}
          rows={(states.data as any[]) ?? []}
          onRowClick={(r) => setDetail({ dim: "state", key: r.key, label: r.label })}
        />
      </Panel>

      {detail && (
        <DetailPanel
          dim={detail.dim}
          entityKey={detail.key}
          label={detail.label}
          from={from}
          to={to}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function DimensionTab({
  dim,
  title,
  from,
  to,
  detail,
  setDetail,
}: {
  dim: "clinic" | "condition";
  title: string;
  from: string;
  to: string;
  detail: { dim: any; key: string; label: string } | null;
  setDetail: (d: any) => void;
}) {
  const [filter, setFilter] = useState("");
  const q = useQuery({
    queryKey: ["analytics-breakdown", dim, from, to],
    queryFn: () => getAnalyticsBreakdown({ data: { dim, from, to, limit: 100 } }),
  });
  const rows = ((q.data as any[]) ?? []).filter((r) =>
    filter ? String(r.label).toLowerCase().includes(filter.toLowerCase()) : true,
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`Top ${title.toLowerCase()} by lead action`}>
          <Bars
            items={[...rows]
              .sort((a, b) => Number(b.lead_actions) - Number(a.lead_actions))
              .slice(0, 10)
              .map((r) => ({ label: r.label, value: Number(r.lead_actions) }))}
          />
        </Panel>
        <Panel title={`Top ${title.toLowerCase()} by impressions`}>
          <Bars
            items={[...rows]
              .sort((a, b) => Number(b.impressions) - Number(a.impressions))
              .slice(0, 10)
              .map((r) => ({ label: r.label, value: Number(r.impressions) }))}
          />
        </Panel>
      </div>

      <Panel
        title={`${title} activity overview`}
        description="Click a row for a full breakdown."
        action={
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={`Filter ${title.toLowerCase()}…`}
            aria-label={`Filter ${title.toLowerCase()}`}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        }
      >
        <DataTable
          columns={[
            { key: "label", label: title },
            { key: "impressions", label: "Impressions", align: "right" },
            { key: "clicks", label: "Clicks", align: "right" },
            { key: "ctr", label: "CTR", align: "right" },
            { key: "lead_actions", label: "Leads", align: "right" },
            { key: "visitors", label: "Visitors", align: "right" },
          ]}
          rows={rows.map((r) => ({
            ...r,
            ctr: pct(Number(r.clicks), Number(r.impressions)),
          }))}
          onRowClick={(r) => setDetail({ dim, key: r.key, label: r.label })}
        />
      </Panel>

      {detail && (
        <DetailPanel
          dim={detail.dim}
          entityKey={detail.key}
          label={detail.label}
          from={from}
          to={to}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function JourneysTab({ from, to }: { from: string; to: string }) {
  const [convertedOnly, setConvertedOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["analytics-journeys", from, to, convertedOnly],
    queryFn: () => getAnalyticsJourneys({ data: { from, to, convertedOnly, limit: 50 } }),
  });
  const sessions = ((q.data as any[]) ?? []).filter(Boolean);

  return (
    <Panel
      title="User journey explorer"
      description="Exactly how visitors search, compare and pick a provider."
      action={
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={convertedOnly}
            onChange={(e) => setConvertedOnly(e.target.checked)}
            className="h-4 w-4"
          />
          Only sessions with a lead action
        </label>
      }
    >
      {q.isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>}
      {q.error && <p className="py-6 text-center text-sm text-destructive">{(q.error as Error).message}</p>}
      {!q.isLoading && sessions.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">No sessions in this period yet.</p>
      )}
      <ul className="space-y-2">
        {sessions.map((s) => {
          const isOpen = open === s.session_id;
          return (
            <li key={s.session_id} className="rounded-lg border border-border">
              <button
                onClick={() => setOpen(isOpen ? null : s.session_id)}
                className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent/40"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">
                    Visitor {String(s.visitor ?? "?").slice(0, 6)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.started_at).toLocaleString()} · {s.is_mobile ? "mobile" : "desktop"} ·{" "}
                    {num(s.steps)} steps · {num(s.searches)} searches · {num(s.clicks)} clicks
                    {s.city_slug ? ` · ${s.city_slug}` : ""}
                  </span>
                  {s.converted && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      lead action
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">{isOpen ? "Hide" : "View path"}</span>
              </button>
              {isOpen && (
                <ol className="space-y-1 border-t border-border px-4 py-3 text-sm">
                  {(s.steps_json as any[]).map((st, i) => (
                    <li key={i} className="flex flex-wrap items-baseline gap-2">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {new Date(st.at).toLocaleTimeString()}
                      </span>
                      <span className="text-foreground">
                        {EVENT_LABELS[st.type] ?? st.type}
                        {st.query ? ` “${st.query}”` : ""}
                        {st.clinic ? ` — ${st.clinic}` : st.nct_id ? ` — ${st.nct_id}` : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">{st.path}</span>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
