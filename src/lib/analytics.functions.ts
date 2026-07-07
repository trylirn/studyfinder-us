import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Range helpers
const RangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

function resolveRange(from?: string, to?: string) {
  const nowIso = new Date().toISOString();
  const defaultFrom = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  return { from: from ?? defaultFrom, to: to ?? nowIso };
}

type EventRow = {
  event_type: string;
  session_id: string | null;
  path: string | null;
  is_mobile: boolean | null;
  city_slug: string | null;
  state_slug: string | null;
  condition_slug: string | null;
  clinic_id: string | null;
  nct_id: string | null;
  query: string | null;
  referrer: string | null;
  occurred_at: string;
};

const LEAD_TYPES = ["lead_call", "lead_website", "lead_directions", "lead_eligibility"];

async function fetchEvents(sb: any, from: string, to: string, limit = 20000): Promise<EventRow[]> {
  const { data, error } = await sb
    .from("analytics_events")
    .select("event_type,session_id,path,is_mobile,city_slug,state_slug,condition_slug,clinic_id,nct_id,query,referrer,occurred_at")
    .gte("occurred_at", from)
    .lte("occurred_at", to)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as EventRow[];
}

function topBy<K extends string>(rows: EventRow[], key: (e: EventRow) => string | null | undefined, take = 10) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([k, v]) => ({ key: k as K, count: v }));
}

function summarize(rows: EventRow[]) {
  let searches = 0, impressions = 0, listingClicks = 0, mobile = 0, mobileKnown = 0;
  const leadByType: Record<string, number> = {};
  const uniqueSessions = new Set<string>();
  const uniqueLeadSessions = new Set<string>();
  for (const r of rows) {
    if (r.event_type === "search") searches++;
    else if (r.event_type === "impression") impressions++;
    else if (r.event_type === "listing_click") listingClicks++;
    if (LEAD_TYPES.includes(r.event_type)) {
      leadByType[r.event_type] = (leadByType[r.event_type] ?? 0) + 1;
      if (r.session_id) uniqueLeadSessions.add(r.session_id);
    }
    if (r.session_id) uniqueSessions.add(r.session_id);
    if (r.is_mobile != null) {
      mobileKnown++;
      if (r.is_mobile) mobile++;
    }
  }
  const leadTotal = LEAD_TYPES.reduce((s, t) => s + (leadByType[t] ?? 0), 0);
  return {
    searches,
    impressions,
    listingClicks,
    leadTotal,
    leadByType,
    uniqueSessions: uniqueSessions.size,
    uniqueLeadSessions: uniqueLeadSessions.size,
    clickRate: impressions > 0 ? listingClicks / impressions : 0,
    mobileShare: mobileKnown > 0 ? mobile / mobileKnown : 0,
  };
}

function referrerHost(ref: string | null): string {
  if (!ref) return "direct";
  try { return new URL(ref).hostname.replace(/^www\./, ""); }
  catch { return "unknown"; }
}

export const getOverviewAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RangeSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context as never);
    const { from, to } = resolveRange(data.from, data.to);
    const rows = await fetchEvents((context as never as { supabase: any }).supabase, from, to);
    const summary = summarize(rows);
    const topCities = topBy(rows.filter((r) => r.event_type === "search" || r.event_type === "listing_click"), (r) => r.city_slug);
    const topClinics = topBy(rows.filter((r) => r.event_type === "listing_click" || LEAD_TYPES.includes(r.event_type)), (r) => r.clinic_id);
    const discovery = topBy(rows, (r) => referrerHost(r.referrer));
    const feed = rows.slice(0, 30);
    return { from, to, summary, topCities, topClinics, discovery, feed };
  });

export const getCitiesAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RangeSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context as never);
    const { from, to } = resolveRange(data.from, data.to);
    const rows = await fetchEvents((context as never as { supabase: any }).supabase, from, to);
    const byCity = new Map<string, { city: string; searches: number; impressions: number; clicks: number; leads: number }>();
    for (const r of rows) {
      const key = r.city_slug;
      if (!key) continue;
      const cur = byCity.get(key) ?? { city: key, searches: 0, impressions: 0, clicks: 0, leads: 0 };
      if (r.event_type === "search") cur.searches++;
      else if (r.event_type === "impression") cur.impressions++;
      else if (r.event_type === "listing_click") cur.clicks++;
      else if (LEAD_TYPES.includes(r.event_type)) cur.leads++;
      byCity.set(key, cur);
    }
    const cities = [...byCity.values()];
    return {
      from, to,
      topByImpressions: [...cities].sort((a, b) => b.impressions - a.impressions).slice(0, 20),
      topBySearches: [...cities].sort((a, b) => b.searches - a.searches).slice(0, 20),
      topByLeads: [...cities].sort((a, b) => b.leads - a.leads).slice(0, 20),
      activity: [...cities].sort((a, b) => (b.searches + b.clicks + b.leads) - (a.searches + a.clicks + a.leads)).slice(0, 50),
    };
  });

export const getCityDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RangeSchema.extend({ slug: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context as never);
    const { from, to } = resolveRange(data.from, data.to);
    const rows = (await fetchEvents((context as never as { supabase: any }).supabase, from, to)).filter((r) => r.city_slug === data.slug);
    const summary = summarize(rows);
    const topClinics = topBy(rows.filter((r) => r.clinic_id), (r) => r.clinic_id);
    const topQueries = topBy(rows.filter((r) => r.event_type === "search" && r.query), (r) => r.query);
    return { from, to, slug: data.slug, summary, topClinics, topQueries, feed: rows.slice(0, 50) };
  });

export const getClinicsAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RangeSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context as never);
    const { from, to } = resolveRange(data.from, data.to);
    const rows = await fetchEvents((context as never as { supabase: any }).supabase, from, to);
    const byClinic = new Map<string, { clinic_id: string; impressions: number; clicks: number; leads: number }>();
    for (const r of rows) {
      const key = r.clinic_id;
      if (!key) continue;
      const cur = byClinic.get(key) ?? { clinic_id: key, impressions: 0, clicks: 0, leads: 0 };
      if (r.event_type === "impression") cur.impressions++;
      else if (r.event_type === "listing_click") cur.clicks++;
      else if (LEAD_TYPES.includes(r.event_type)) cur.leads++;
      byClinic.set(key, cur);
    }
    const clinics = [...byClinic.values()];
    // hydrate names
    const ids = clinics.map((c) => c.clinic_id);
    const sb = (context as never as { supabase: any }).supabase;
    const names: Record<string, { name: string; slug: string; city: string | null; state: string | null }> = {};
    if (ids.length > 0) {
      const { data: cs } = await sb.from("clinics").select("id,name,slug,city,state").in("id", ids);
      for (const c of (cs ?? []) as { id: string; name: string; slug: string; city: string | null; state: string | null }[]) {
        names[c.id] = { name: c.name, slug: c.slug, city: c.city, state: c.state };
      }
    }
    const enrich = (c: typeof clinics[number]) => ({ ...c, ...(names[c.clinic_id] ?? { name: c.clinic_id, slug: "", city: null, state: null }) });
    return {
      from, to,
      topByLeads: [...clinics].sort((a, b) => b.leads - a.leads).slice(0, 20).map(enrich),
      topByImpressions: [...clinics].sort((a, b) => b.impressions - a.impressions).slice(0, 20).map(enrich),
      activity: [...clinics].sort((a, b) => (b.clicks + b.leads) - (a.clicks + a.leads)).slice(0, 50).map(enrich),
    };
  });

export const getConditionsAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RangeSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context as never);
    const { from, to } = resolveRange(data.from, data.to);
    const rows = await fetchEvents((context as never as { supabase: any }).supabase, from, to);
    const map = new Map<string, { slug: string; searches: number; impressions: number; leads: number }>();
    for (const r of rows) {
      const key = r.condition_slug;
      if (!key) continue;
      const cur = map.get(key) ?? { slug: key, searches: 0, impressions: 0, leads: 0 };
      if (r.event_type === "search") cur.searches++;
      else if (r.event_type === "impression") cur.impressions++;
      else if (LEAD_TYPES.includes(r.event_type)) cur.leads++;
      map.set(key, cur);
    }
    const conds = [...map.values()];
    return {
      from, to,
      topBySearches: [...conds].sort((a, b) => b.searches - a.searches).slice(0, 20),
      topByImpressions: [...conds].sort((a, b) => b.impressions - a.impressions).slice(0, 20),
      topByLeads: [...conds].sort((a, b) => b.leads - a.leads).slice(0, 20),
    };
  });

export const getJourneys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RangeSchema.extend({ limitSessions: z.number().int().min(1).max(200).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context as never);
    const { from, to } = resolveRange(data.from, data.to);
    const rows = await fetchEvents((context as never as { supabase: any }).supabase, from, to, 10000);
    // Group by session_id, keep sessions with ≥1 lead action first
    const bySession = new Map<string, EventRow[]>();
    for (const r of rows) {
      if (!r.session_id) continue;
      const arr = bySession.get(r.session_id) ?? [];
      arr.push(r);
      bySession.set(r.session_id, arr);
    }
    const list = [...bySession.entries()].map(([sid, evs]) => {
      const sorted = evs.slice().sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
      const hasLead = sorted.some((e) => LEAD_TYPES.includes(e.event_type));
      return {
        session_id: sid,
        events: sorted,
        first_at: sorted[0].occurred_at,
        last_at: sorted[sorted.length - 1].occurred_at,
        has_lead: hasLead,
      };
    });
    list.sort((a, b) => (Number(b.has_lead) - Number(a.has_lead)) || b.last_at.localeCompare(a.last_at));
    return { from, to, sessions: list.slice(0, data.limitSessions ?? 50) };
  });
