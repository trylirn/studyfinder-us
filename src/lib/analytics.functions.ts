import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const slug = z.string().max(120).nullable().optional();

const eventSchema = z.object({
  event_type: z.enum([
    "page_view",
    "search",
    "impression",
    "listing_click",
    "lead_call",
    "lead_website",
    "lead_directions",
    "lead_eligibility",
  ]),
  path: z.string().max(500).nullable().optional(),
  query: z.string().max(300).nullable().optional(),
  city_slug: slug,
  state_slug: slug,
  condition_slug: slug,
  clinic_id: z.string().uuid().nullable().optional(),
  nct_id: z.string().max(40).nullable().optional(),
  referrer: z.string().max(500).nullable().optional(),
  is_mobile: z.boolean().nullable().optional(),
  session_id: z.string().uuid(),
  visitor_id: z.string().max(64),
  meta: z.record(z.string(), z.any()).optional(),
});

export const trackEvents = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ events: z.array(eventSchema).max(40) }).parse(d))
  .handler(async ({ data }) => {
    if (data.events.length === 0) return { ok: true, count: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = data.events.map((e) => ({
      event_type: e.event_type,
      path: e.path ?? null,
      query: e.query ?? null,
      city_slug: e.city_slug ?? null,
      state_slug: e.state_slug ?? null,
      condition_slug: e.condition_slug ?? null,
      clinic_id: e.clinic_id ?? null,
      nct_id: e.nct_id ?? null,
      referrer: e.referrer ?? null,
      is_mobile: e.is_mobile ?? null,
      session_id: e.session_id,
      visitor_id: e.visitor_id,
      meta: (e.meta ?? {}) as Record<string, unknown>,
    }));
    const { error } = await supabaseAdmin.from("analytics_events").insert(rows as never);
    if (error) throw new Error(error.message);
    return { ok: true, count: rows.length };
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

const rangeSchema = z.object({
  from: z.string().min(10).max(40),
  to: z.string().min(10).max(40),
});

function prevRange(from: string, to: string) {
  const f = new Date(from).getTime();
  const t = new Date(to).getTime();
  const span = Math.max(t - f, 60_000);
  return { from: new Date(f - span).toISOString(), to: new Date(f).toISOString() };
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc(fn as never, args as never);
  if (error) throw new Error(error.message);
  return data as T;
}

export const getAnalyticsOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const prev = prevRange(data.from, data.to);
    const spanHours = (new Date(data.to).getTime() - new Date(data.from).getTime()) / 3_600_000;
    const bucket = spanHours <= 48 ? "hour" : "day";
    const [overview, previous, series, cities, clinics, conditions, feed] = await Promise.all([
      rpc<any>("analytics_overview", { _from: data.from, _to: data.to }),
      rpc<any>("analytics_overview", { _from: prev.from, _to: prev.to }),
      rpc<any>("analytics_series", { _from: data.from, _to: data.to, _bucket: bucket }),
      rpc<any>("analytics_breakdown", { _from: data.from, _to: data.to, _dim: "city", _limit: 10 }),
      rpc<any>("analytics_breakdown", { _from: data.from, _to: data.to, _dim: "clinic", _limit: 10 }),
      rpc<any>("analytics_breakdown", { _from: data.from, _to: data.to, _dim: "condition", _limit: 10 }),
      rpc<any>("analytics_feed", { _limit: 40 }),
    ]);
    return { overview, previous, series, bucket, cities, clinics, conditions, feed };
  });

export const getAnalyticsBreakdown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    rangeSchema
      .extend({
        dim: z.enum(["city", "state", "clinic", "condition", "query"]),
        limit: z.number().int().min(1).max(200).default(25),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return rpc<any>("analytics_breakdown", {
      _from: data.from,
      _to: data.to,
      _dim: data.dim,
      _limit: data.limit,
    });
  });

export const getAnalyticsFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(100).default(40) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return rpc<any>("analytics_feed", { _limit: data.limit });
  });

export const getAnalyticsJourneys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    rangeSchema.extend({ convertedOnly: z.boolean().default(false), limit: z.number().int().min(1).max(100).default(30) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return rpc<any>("analytics_journeys", {
      _from: data.from,
      _to: data.to,
      _converted: data.convertedOnly,
      _limit: data.limit,
    });
  });

/** Drill-down for one city / state / clinic / condition within a range. */
export const getAnalyticsDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    rangeSchema.extend({ dim: z.enum(["city", "state", "clinic", "condition"]), key: z.string().max(160) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let clinicId: string | null = null;
    if (data.dim === "clinic") {
      const { data: c } = await supabaseAdmin.from("clinics").select("id,name,slug,city,state").eq("slug", data.key).maybeSingle();
      if (!c) throw new Error("Not found");
      clinicId = c.id;
    }

    let q = supabaseAdmin
      .from("analytics_events")
      .select("event_type,occurred_at,visitor_id,session_id,is_mobile,path,query,clinic_id,city_slug,state_slug,condition_slug,nct_id")
      .gte("occurred_at", data.from)
      .lt("occurred_at", data.to)
      .order("occurred_at", { ascending: false })
      .limit(20000);

    if (data.dim === "city") q = q.eq("city_slug", data.key);
    if (data.dim === "state") q = q.eq("state_slug", data.key);
    if (data.dim === "condition") q = q.eq("condition_slug", data.key);
    if (data.dim === "clinic") q = q.eq("clinic_id", clinicId!);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const events = rows ?? [];

    const uniq = (pred: (r: any) => boolean) =>
      new Set(events.filter(pred).map((r: any) => r.visitor_id ?? r.session_id)).size;
    const count = (pred: (r: any) => boolean) => events.filter(pred).length;

    const clinicIds = Array.from(
      new Set(events.map((r: any) => r.clinic_id).filter(Boolean) as string[]),
    ).slice(0, 200);
    const clinicNames = new Map<string, { name: string; slug: string }>();
    if (clinicIds.length) {
      const { data: cs } = await supabaseAdmin.from("clinics").select("id,name,slug").in("id", clinicIds);
      for (const c of cs ?? []) clinicNames.set(c.id, { name: c.name, slug: c.slug });
    }

    function group(keyFn: (r: any) => string | null | undefined, label?: (k: string) => string) {
      const m = new Map<string, { key: string; label: string; impressions: number; clicks: number; lead_actions: number }>();
      for (const r of events as any[]) {
        const k = keyFn(r);
        if (!k) continue;
        const e = m.get(k) ?? { key: k, label: label ? label(k) : k, impressions: 0, clicks: 0, lead_actions: 0 };
        if (r.event_type === "impression") e.impressions++;
        else if (r.event_type === "listing_click") e.clicks++;
        else if (String(r.event_type).startsWith("lead_")) e.lead_actions++;
        m.set(k, e);
      }
      return Array.from(m.values())
        .sort((a, b) => b.lead_actions - a.lead_actions || b.clicks - a.clicks || b.impressions - a.impressions)
        .slice(0, 10);
    }

    return {
      totals: {
        impressions: count((r) => r.event_type === "impression"),
        clicks: count((r) => r.event_type === "listing_click"),
        searches: count((r) => r.event_type === "search"),
        lead_actions: count((r) => String(r.event_type).startsWith("lead_")),
        unique_leads: uniq((r) => String(r.event_type).startsWith("lead_")),
        visitors: uniq(() => true),
        mobile_visitors: uniq((r) => r.is_mobile === true),
      },
      leadBreakdown: ["lead_call", "lead_website", "lead_directions", "lead_eligibility"].map((t) => ({
        action: t,
        count: count((r) => r.event_type === t),
        people: uniq((r) => r.event_type === t),
      })),
      topClinics: group(
        (r) => r.clinic_id,
        (k) => clinicNames.get(k)?.name ?? "Unknown clinic",
      ).map((r) => ({ ...r, slug: clinicNames.get(r.key)?.slug ?? null })),
      topConditions: group((r) => r.condition_slug),
      topCities: group((r) => r.city_slug),
      recentQueries: Array.from(
        new Set(
          (events as any[])
            .filter((r) => r.event_type === "search" && r.query)
            .map((r) => String(r.query).toLowerCase().trim()),
        ),
      ).slice(0, 15),
    };
  });
