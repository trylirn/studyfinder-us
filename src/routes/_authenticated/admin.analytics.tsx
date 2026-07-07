import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getOverviewAnalytics,
  getCitiesAnalytics,
  getCityDetail,
  getClinicsAnalytics,
  getConditionsAnalytics,
  getJourneys,
} from "@/lib/analytics.functions";
import { AnalyticsRangePicker, resolveRange, type RangeValue } from "@/components/AnalyticsRangePicker";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AnalyticsPage,
});

type Tab = "overview" | "cities" | "clinics" | "conditions" | "journeys";

function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const initial = resolveRange("7d");
  const [range, setRange] = useState<RangeValue>({ key: "7d", ...initial });
  const rangeArg = { from: range.from, to: range.to };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Directory usage, discovery, and lead intent.</p>
        </div>
        <Link to="/_authenticated/admin" className="text-sm text-muted-foreground hover:text-foreground">← Back to admin</Link>
      </div>

      <AnalyticsRangePicker value={range} onChange={setRange} />

      <div className="mt-5 flex gap-2 overflow-x-auto border-b border-border">
        {(["overview", "cities", "clinics", "conditions", "journeys"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm capitalize ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "overview" && <OverviewTab arg={rangeArg} />}
        {tab === "cities" && <CitiesTab arg={rangeArg} />}
        {tab === "clinics" && <ClinicsTab arg={rangeArg} />}
        {tab === "conditions" && <ConditionsTab arg={rangeArg} />}
        {tab === "journeys" && <JourneysTab arg={rangeArg} />}
      </div>
    </div>
  );
}

// ---------- reusable UI ----------
function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function BarList({ title, items }: { title: string; items: { key: string; count: number; label?: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      {items.length === 0 && <p className="text-xs text-muted-foreground">No data.</p>}
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.key} className="text-xs">
            <div className="flex items-center justify-between">
              <span className="truncate pr-2">{i.label ?? i.key}</span>
              <span className="tabular-nums text-muted-foreground">{i.count}</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded bg-muted">
              <div className="h-1.5 rounded bg-primary" style={{ width: `${(i.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function fmtPct(n: number) { return `${(n * 100).toFixed(1)}%`; }

// ---------- Overview ----------
function OverviewTab({ arg }: { arg: { from: string; to: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-overview", arg],
    queryFn: () => getOverviewAnalytics({ data: arg }),
    refetchInterval: 15000,
  });
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const s = data.summary;
  const leadTypes = Object.entries(s.leadByType).map(([k, v]) => ({ key: k, count: v as number, label: k.replace("lead_", "") }));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Searches" value={s.searches} />
        <Stat label="Impressions" value={s.impressions} />
        <Stat label="Listing clicks" value={s.listingClicks} hint={`CTR ${fmtPct(s.clickRate)}`} />
        <Stat label="Lead actions" value={s.leadTotal} hint={`${s.uniqueLeadSessions} unique people`} />
        <Stat label="Unique visitors" value={s.uniqueSessions} />
        <Stat label="Mobile share" value={fmtPct(s.mobileShare)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <BarList title="Top cities (searches + clicks)" items={data.topCities.map((t) => ({ key: t.key, count: t.count }))} />
        <BarList title="Top clinics by lead intent" items={data.topClinics.map((t) => ({ key: t.key, count: t.count }))} />
        <BarList title="How users discover" items={data.discovery.map((t) => ({ key: t.key, count: t.count }))} />
        <BarList title="Lead action breakdown" items={leadTypes} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-semibold">Live action feed</p>
        <ul className="divide-y divide-border text-xs">
          {data.feed.map((e, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 py-2">
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{e.event_type}</span>
              <span className="text-muted-foreground">{new Date(e.occurred_at).toLocaleTimeString()}</span>
              <span className="truncate text-foreground/80">{e.path}</span>
              {e.query && <span className="text-muted-foreground">q="{e.query}"</span>}
              {e.city_slug && <span className="text-muted-foreground">city:{e.city_slug}</span>}
              {e.nct_id && <span className="text-muted-foreground">{e.nct_id}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------- Cities ----------
function CitiesTab({ arg }: { arg: { from: string; to: string } }) {
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-cities", arg],
    queryFn: () => getCitiesAnalytics({ data: arg }),
  });
  const detail = useQuery({
    queryKey: ["analytics-city", arg, selected],
    queryFn: () => getCityDetail({ data: { ...arg, slug: selected as string } }),
    enabled: !!selected,
  });
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <BarList title="Top by impressions" items={data.topByImpressions.map((c) => ({ key: c.city, count: c.impressions }))} />
        <BarList title="Top by searches" items={data.topBySearches.map((c) => ({ key: c.city, count: c.searches }))} />
        <BarList title="Top by lead actions" items={data.topByLeads.map((c) => ({ key: c.city, count: c.leads }))} />
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-semibold">City activity (click a row)</p>
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr><th className="text-left">City</th><th className="text-right">Searches</th><th className="text-right">Impr.</th><th className="text-right">Clicks</th><th className="text-right">Leads</th></tr>
          </thead>
          <tbody>
            {data.activity.map((c) => (
              <tr key={c.city} onClick={() => setSelected(c.city)} className={`cursor-pointer border-t border-border ${selected === c.city ? "bg-muted/40" : "hover:bg-muted/20"}`}>
                <td className="py-1.5">{c.city}</td>
                <td className="text-right tabular-nums">{c.searches}</td>
                <td className="text-right tabular-nums">{c.impressions}</td>
                <td className="text-right tabular-nums">{c.clicks}</td>
                <td className="text-right tabular-nums">{c.leads}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && detail.data && (
        <div className="rounded-xl border border-primary/30 bg-card p-4">
          <p className="mb-2 text-sm font-semibold">Detail: {selected}</p>
          <div className="grid gap-3 md:grid-cols-4">
            <Stat label="Searches" value={detail.data.summary.searches} />
            <Stat label="Impressions" value={detail.data.summary.impressions} />
            <Stat label="Clicks" value={detail.data.summary.listingClicks} />
            <Stat label="Leads" value={detail.data.summary.leadTotal} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <BarList title="Top clinics in city" items={detail.data.topClinics.map((c) => ({ key: c.key, count: c.count }))} />
            <BarList title="Top search queries" items={detail.data.topQueries.map((c) => ({ key: c.key, count: c.count }))} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Clinics ----------
function ClinicsTab({ arg }: { arg: { from: string; to: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-clinics", arg],
    queryFn: () => getClinicsAnalytics({ data: arg }),
  });
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <BarList title="Top clinics by lead actions" items={data.topByLeads.map((c) => ({ key: c.clinic_id, count: c.leads, label: c.name }))} />
        <BarList title="Top clinics by impressions" items={data.topByImpressions.map((c) => ({ key: c.clinic_id, count: c.impressions, label: c.name }))} />
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-semibold">Provider activity</p>
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr><th className="text-left">Clinic</th><th className="text-left">City</th><th className="text-right">Impr.</th><th className="text-right">Clicks</th><th className="text-right">Leads</th></tr>
          </thead>
          <tbody>
            {data.activity.map((c) => (
              <tr key={c.clinic_id} className="border-t border-border">
                <td className="py-1.5">
                  {c.slug ? <Link to="/clinics/$slug" params={{ slug: c.slug }} className="text-primary hover:underline">{c.name}</Link> : c.name}
                </td>
                <td>{[c.city, c.state].filter(Boolean).join(", ")}</td>
                <td className="text-right tabular-nums">{c.impressions}</td>
                <td className="text-right tabular-nums">{c.clicks}</td>
                <td className="text-right tabular-nums">{c.leads}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Conditions ----------
function ConditionsTab({ arg }: { arg: { from: string; to: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-conditions", arg],
    queryFn: () => getConditionsAnalytics({ data: arg }),
  });
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <BarList title="Top by searches" items={data.topBySearches.map((c) => ({ key: c.slug, count: c.searches }))} />
      <BarList title="Top by impressions" items={data.topByImpressions.map((c) => ({ key: c.slug, count: c.impressions }))} />
      <BarList title="Top by lead actions" items={data.topByLeads.map((c) => ({ key: c.slug, count: c.leads }))} />
    </div>
  );
}

// ---------- Journeys ----------
function JourneysTab({ arg }: { arg: { from: string; to: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-journeys", arg],
    queryFn: () => getJourneys({ data: { ...arg, limitSessions: 50 } }),
  });
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{data.sessions.length} sessions (leads first).</p>
      {data.sessions.map((s) => (
        <div key={s.session_id} className="rounded-xl border border-border bg-card p-3 text-xs">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="font-mono text-muted-foreground">{s.session_id.slice(0, 8)}…</span>
            {s.has_lead && <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] uppercase text-success">Lead</span>}
            <span className="text-muted-foreground">{new Date(s.first_at).toLocaleString()} → {new Date(s.last_at).toLocaleTimeString()}</span>
            <span className="text-muted-foreground">{s.events.length} events</span>
          </div>
          <ol className="flex flex-wrap items-center gap-1">
            {s.events.map((e, i) => (
              <li key={i} className="inline-flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground">→</span>}
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{e.event_type}</span>
                {e.query && <span className="text-muted-foreground">"{e.query}"</span>}
                {e.city_slug && <span className="text-muted-foreground">{e.city_slug}</span>}
                {e.nct_id && <span className="text-muted-foreground">{e.nct_id}</span>}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
