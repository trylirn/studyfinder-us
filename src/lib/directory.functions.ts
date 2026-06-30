import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const SEARCH_PAGE_SIZE = 20;
const LIST_PAGE_SIZE = 60;

// Studies considered "displayable": have a summary and are not abandoned.
// Mirrors the predicates in refresh_directory_counts().
function applyStudyVisibility<T extends { not: (...a: any[]) => T; not2?: any }>(q: T): T {
  // @ts-ignore — chainable supabase filter typing
  return q.not("brief_summary", "is", null).not("overall_status", "in", "(WITHDRAWN,TERMINATED)");
}

export const searchStudies = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        q: z.string().optional().default(""),
        condition: z.string().optional(),
        state: z.string().optional(),
        city: z.string().optional(),
        sponsor: z.string().optional(),
        phase: z.string().optional(),
        status: z.string().optional(),
        page: z.coerce.number().int().min(1).max(500).optional().default(1),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q: any = sb
      .from("studies")
      .select(
        "nct_id,title,brief_summary,phase,overall_status,sponsor_name,conditions,state_slugs,city_slugs,last_update_posted,enrollment",
        { count: "exact" },
      );
    q = applyStudyVisibility(q);

    if (data.q?.trim()) {
      q = q.textSearch("search_tsv", data.q.trim().replace(/[^\w\s]/g, " "), { type: "websearch" });
    }
    if (data.condition) q = q.contains("condition_slugs", [data.condition]);
    if (data.state) q = q.contains("state_slugs", [data.state]);
    if (data.city) q = q.contains("city_slugs", [data.city]);
    if (data.sponsor) q = q.eq("sponsor_slug", data.sponsor);
    if (data.status) q = q.eq("overall_status", data.status);
    if (data.phase) q = q.ilike("phase", `%PHASE${data.phase}%`);

    const from = (data.page - 1) * SEARCH_PAGE_SIZE;
    q = q
      .order("last_update_posted", { ascending: false, nullsFirst: false })
      .order("nct_id", { ascending: false })
      .range(from, from + SEARCH_PAGE_SIZE - 1);

    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return {
      rows: rows ?? [],
      total: count ?? 0,
      page: data.page,
      pageSize: SEARCH_PAGE_SIZE,
    };
  });

export const getStudy = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ nctId: z.string().regex(/^NCT\d+$/i) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const nctId = data.nctId.toUpperCase();
    const STUDY_COLS =
      "nct_id,title,brief_summary,detailed_description,phase,overall_status,study_type,conditions,condition_slugs,interventions,eligibility,min_age_years,max_age_years,gender,sponsor_name,sponsor_slug,collaborators,start_date,completion_date,last_update_posted,enrollment,state_slugs,city_slugs,imported_at,updated_at";
    const [{ data: study, error: e1 }, { data: locations, error: e2 }] = await Promise.all([
      sb.from("studies").select(STUDY_COLS).eq("nct_id", nctId).maybeSingle(),
      sb
        .from("locations")
        .select("id,nct_id,facility,city,city_slug,state,state_slug,country,zip,status,lat,lng,clinic_id")
        .eq("nct_id", nctId),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    if (!study) return null;

    const primary = (study.condition_slugs ?? [])[0];
    const related = primary
      ? (
          await sb
            .from("studies")
            .select("nct_id,title,overall_status,phase")
            .contains("condition_slugs", [primary])
            .neq("nct_id", nctId)
            .not("brief_summary", "is", null)
            .order("last_update_posted", { ascending: false, nullsFirst: false })
            .order("nct_id", { ascending: false })
            .limit(6)
        ).data ?? []
      : [];

    // Hydrate clinic info for any linked clinics.
    const clinicIds = Array.from(new Set(((locations ?? []) as any[]).map((l) => l.clinic_id).filter(Boolean)));
    const clinicMap: Record<string, { slug: string; name: string }> = {};
    if (clinicIds.length > 0) {
      const { data: clinics } = await sb.from("clinics").select("id,slug,name").in("id", clinicIds);
      for (const c of (clinics ?? []) as any[]) clinicMap[c.id] = { slug: c.slug, name: c.name };
    }

    return { study, locations: locations ?? [], related, clinicMap };
  });

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [topConditions, topStates, topSponsors, topClinics, recent, totals] = await Promise.all([
    sb.from("conditions").select("slug,name,study_count").gt("study_count", 0).order("study_count", { ascending: false }).limit(18),
    sb.from("states").select("slug,name,study_count").order("study_count", { ascending: false }).limit(12),
    sb.from("sponsors").select("slug,name,study_count").gt("study_count", 0).order("study_count", { ascending: false }).limit(8),
    sb
      .from("clinics")
      .select("slug,name,city,state,recruiting_count")
      .eq("published", true)
      .gt("recruiting_count", 0)
      .order("recruiting_count", { ascending: false })
      .limit(8),
    sb
      .from("studies")
      .select("nct_id,title,overall_status,phase,sponsor_name,conditions")
      .not("brief_summary", "is", null)
      .not("overall_status", "in", "(WITHDRAWN,TERMINATED)")
      .order("last_update_posted", { ascending: false, nullsFirst: false })
      .order("nct_id", { ascending: false })
      .limit(8),
    sb.from("studies").select("nct_id", { count: "exact", head: true }),
  ]);
  const recruiting = await sb
    .from("studies")
    .select("nct_id", { count: "exact", head: true })
    .eq("overall_status", "RECRUITING");
  return {
    topConditions: topConditions.data ?? [],
    topStates: topStates.data ?? [],
    topSponsors: topSponsors.data ?? [],
    topClinics: topClinics.data ?? [],
    recent: recent.data ?? [],
    totalStudies: totals.count ?? 0,
    totalRecruiting: recruiting.count ?? 0,
  };
});

export const getConditionPage = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ slug: z.string(), stateSlug: z.string().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    const [{ data: cond }, { data: state }] = await Promise.all([
      sb.from("conditions").select("*").eq("slug", data.slug).maybeSingle(),
      data.stateSlug
        ? sb.from("states").select("*").eq("slug", data.stateSlug).maybeSingle()
        : Promise.resolve({ data: null } as { data: null }),
    ]);
    if (!cond) return null;

    let q: any = sb
      .from("studies")
      .select("nct_id,title,overall_status,phase,sponsor_name,conditions,state_slugs", { count: "exact" })
      .contains("condition_slugs", [data.slug])
      .not("brief_summary", "is", null)
      .not("overall_status", "in", "(WITHDRAWN,TERMINATED)");
    if (data.stateSlug) q = q.contains("state_slugs", [data.stateSlug]);
    const { data: studies, count } = await q
      .order("last_update_posted", { ascending: false, nullsFirst: false })
      .order("nct_id", { ascending: false })
      .limit(25);

    const topStatesRows =
      (
        await sb
          .from("studies")
          .select("state_slugs")
          .contains("condition_slugs", [data.slug])
          .not("brief_summary", "is", null)
          .limit(500)
      ).data ?? [];
    const stateCounts = new Map<string, number>();
    for (const r of topStatesRows) {
      for (const s of r.state_slugs ?? []) stateCounts.set(s, (stateCounts.get(s) ?? 0) + 1);
    }
    const topStateSlugs = [...stateCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([s]) => s);
    const topStates =
      topStateSlugs.length > 0
        ? (await sb.from("states").select("slug,name,abbr").in("slug", topStateSlugs)).data ?? []
        : [];

    const related =
      (await sb.from("conditions").select("slug,name,study_count").neq("slug", data.slug).gt("study_count", 0).order("study_count", { ascending: false }).limit(8)).data ?? [];

    return { condition: cond, state, studies: studies ?? [], total: count ?? 0, topStates, related };
  });

export const getStatePage = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: state } = await sb.from("states").select("*").eq("slug", data.slug).maybeSingle();
    if (!state) return null;
    const [{ data: studies, count }, { data: cities }] = await Promise.all([
      sb
        .from("studies")
        .select("nct_id,title,overall_status,phase,sponsor_name,conditions", { count: "exact" })
        .contains("state_slugs", [data.slug])
        .not("brief_summary", "is", null)
        .not("overall_status", "in", "(WITHDRAWN,TERMINATED)")
        .order("last_update_posted", { ascending: false, nullsFirst: false })
        .order("nct_id", { ascending: false })
        .limit(25),
      sb.from("cities").select("slug,name,study_count").eq("state_slug", data.slug).gt("study_count", 0).order("study_count", { ascending: false }).limit(20),
    ]);

    const condRows =
      (await sb.from("studies").select("condition_slugs").contains("state_slugs", [data.slug]).not("brief_summary", "is", null).limit(500)).data ?? [];
    const condCounts = new Map<string, number>();
    for (const r of condRows) for (const c of r.condition_slugs ?? []) condCounts.set(c, (condCounts.get(c) ?? 0) + 1);
    const topCondSlugs = [...condCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([s]) => s);
    const topConditions =
      topCondSlugs.length > 0
        ? (await sb.from("conditions").select("slug,name").in("slug", topCondSlugs)).data ?? []
        : [];

    return { state, studies: studies ?? [], total: count ?? 0, cities: cities ?? [], topConditions };
  });

export const getCityPage = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: city } = await sb.from("cities").select("*").eq("slug", data.slug).maybeSingle();
    if (!city) return null;
    const { data: state } = await sb.from("states").select("*").eq("slug", city.state_slug).maybeSingle();
    const { data: studies, count } = await sb
      .from("studies")
      .select("nct_id,title,overall_status,phase,sponsor_name,conditions", { count: "exact" })
      .contains("city_slugs", [data.slug])
      .not("brief_summary", "is", null)
      .not("overall_status", "in", "(WITHDRAWN,TERMINATED)")
      .order("last_update_posted", { ascending: false, nullsFirst: false })
      .order("nct_id", { ascending: false })
      .limit(30);
    const nearby =
      (await sb.from("cities").select("slug,name,study_count").eq("state_slug", city.state_slug).neq("slug", city.slug).gt("study_count", 0).order("study_count", { ascending: false }).limit(10)).data ?? [];
    return { city, state, studies: studies ?? [], total: count ?? 0, nearby };
  });

export const getSponsorPage = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: sponsor } = await sb.from("sponsors").select("*").eq("slug", data.slug).maybeSingle();
    if (!sponsor) return null;
    const { data: studies, count } = await sb
      .from("studies")
      .select("nct_id,title,overall_status,phase,conditions", { count: "exact" })
      .eq("sponsor_slug", data.slug)
      .not("brief_summary", "is", null)
      .not("overall_status", "in", "(WITHDRAWN,TERMINATED)")
      .order("last_update_posted", { ascending: false, nullsFirst: false })
      .order("nct_id", { ascending: false })
      .limit(30);
    return { sponsor, studies: studies ?? [], total: count ?? 0 };
  });

export const getPhasePage = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ phase: z.enum(["1", "2", "3", "4"]) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: studies, count } = await sb
      .from("studies")
      .select("nct_id,title,overall_status,phase,sponsor_name,conditions", { count: "exact" })
      .ilike("phase", `%PHASE${data.phase}%`)
      .not("brief_summary", "is", null)
      .not("overall_status", "in", "(WITHDRAWN,TERMINATED)")
      .order("last_update_posted", { ascending: false, nullsFirst: false })
      .order("nct_id", { ascending: false })
      .limit(30);
    return { phase: data.phase, studies: studies ?? [], total: count ?? 0 };
  });

// -------------------- LIST (filter + pagination) --------------------

export const listConditions = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ q: z.string().optional().default(""), page: z.coerce.number().int().min(1).max(500).optional().default(1) }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q: any = sb.from("conditions").select("slug,name,study_count", { count: "exact" }).gt("study_count", 0);
    if (data.q.trim()) q = q.ilike("name", `%${data.q.trim()}%`);
    const from = (data.page - 1) * LIST_PAGE_SIZE;
    q = q.order("study_count", { ascending: false }).range(from, from + LIST_PAGE_SIZE - 1);
    const { data: rows, count } = await q;
    return { rows: (rows ?? []) as { slug: string; name: string; study_count: number }[], total: count ?? 0, page: data.page, pageSize: LIST_PAGE_SIZE };
  });

export const listStates = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ q: z.string().optional().default("") }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q: any = sb.from("states").select("slug,name,abbr,study_count");
    if (data.q.trim()) q = q.ilike("name", `%${data.q.trim()}%`);
    const { data: rows } = await q.order("name");
    return (rows ?? []) as { slug: string; name: string; abbr: string; study_count: number }[];
  });

export const listSponsors = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ q: z.string().optional().default(""), page: z.coerce.number().int().min(1).max(500).optional().default(1) }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q: any = sb.from("sponsors").select("slug,name,study_count", { count: "exact" }).gt("study_count", 0);
    if (data.q.trim()) q = q.ilike("name", `%${data.q.trim()}%`);
    const from = (data.page - 1) * LIST_PAGE_SIZE;
    q = q.order("study_count", { ascending: false }).range(from, from + LIST_PAGE_SIZE - 1);
    const { data: rows, count } = await q;
    return { rows: (rows ?? []) as { slug: string; name: string; study_count: number }[], total: count ?? 0, page: data.page, pageSize: LIST_PAGE_SIZE };
  });

export const listRecruiting = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        q: z.string().optional().default(""),
        state: z.string().optional().default(""),
        phase: z.string().optional().default(""),
        page: z.coerce.number().int().min(1).max(500).optional().default(1),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q: any = sb
      .from("studies")
      .select("nct_id,title,overall_status,phase,sponsor_name,conditions", { count: "exact" })
      .eq("overall_status", "RECRUITING")
      .not("brief_summary", "is", null);
    if (data.q.trim()) q = q.textSearch("search_tsv", data.q.trim().replace(/[^\w\s]/g, " "), { type: "websearch" });
    if (data.state) q = q.contains("state_slugs", [data.state]);
    if (data.phase) q = q.ilike("phase", `%PHASE${data.phase}%`);
    const from = (data.page - 1) * SEARCH_PAGE_SIZE;
    q = q
      .order("last_update_posted", { ascending: false, nullsFirst: false })
      .order("nct_id", { ascending: false })
      .range(from, from + SEARCH_PAGE_SIZE - 1);
    const { data: rows, count } = await q;
    return { studies: rows ?? [], total: count ?? 0, page: data.page, pageSize: SEARCH_PAGE_SIZE };
  });

// -------------------- CLINICS --------------------

export const listClinics = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        q: z.string().optional().default(""),
        state: z.string().optional().default(""),
        page: z.coerce.number().int().min(1).max(500).optional().default(1),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q: any = sb
      .from("clinics")
      // 🚀 FIXED: Removed non-existent logo_url column
      .select("slug,name,city,state,zip,recruiting_count,plan,featured_until", { count: "exact" })
      .eq("published", true);

    if (data.q.trim()) q = q.ilike("name", `%${data.q.trim()}%`);
    if (data.state) {
      const s = data.state.trim();
      q = q.or(`state.ilike.${s},state.ilike.${s.toUpperCase()}`);
    }

    const from = (data.page - 1) * LIST_PAGE_SIZE;
    q = q
      .order("recruiting_count", { ascending: false })
      .order("name", { ascending: true })
      .range(from, from + LIST_PAGE_SIZE - 1);

    // 🚀 FIXED: Capturing and checking for errors instead of failing silently
    const { data: rows, count, error } = await q;
    if (error) {
      console.error("Error loading public clinics directory:", error);
      throw new Error(error.message);
    }

    return { rows: rows ?? [], total: count ?? 0, page: data.page, pageSize: LIST_PAGE_SIZE };
  });

export const getClinicPage = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: clinic } = await sb.from("clinics").select("*").eq("slug", data.slug).maybeSingle();
    if (!clinic) return null;
    // Active recruiting trials at this clinic
    const { data: locs } = await sb
      .from("locations")
      .select("nct_id, facility, city, state, status")
      .eq("clinic_id", (clinic as any).id);
    const nctIds = Array.from(new Set(((locs ?? []) as any[]).map((l) => l.nct_id)));
    let trials: any[] = [];
    if (nctIds.length > 0) {
      const { data } = await sb
        .from("studies")
        .select("nct_id,title,overall_status,phase,conditions,sponsor_name,last_update_posted")
        .in("nct_id", nctIds)
        .not("brief_summary", "is", null)
        .order("last_update_posted", { ascending: false, nullsFirst: false })
        .order("nct_id", { ascending: false })
        .limit(60);
      trials = data ?? [];
    }
    return { clinic, trials };
  });

export const nearbySitesForStudy = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ nctId: z.string(), zip: z.string().regex(/^\d{5}$/), radius: z.coerce.number().min(5).max(500).default(50) }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    // Resolve zip -> lat/lng via zippopotam.us (free, no key)
    const res = await fetch(`https://api.zippopotam.us/us/${data.zip}`);
    if (!res.ok) return { ok: false as const, reason: "ZIP not found" };
    const body = (await res.json()) as { places?: { latitude: string; longitude: string; "place name": string; "state abbreviation": string }[] };
    const place = body.places?.[0];
    if (!place) return { ok: false as const, reason: "ZIP not found" };
    const lat = parseFloat(place.latitude);
    const lng = parseFloat(place.longitude);
    const { data: sites, error } = await sb.rpc("nearby_sites", {
      _lat: lat,
      _lng: lng,
      _radius_mi: data.radius,
      _nct_id: data.nctId,
    });
    if (error) return { ok: false as const, reason: error.message };
    return {
      ok: true as const,
      origin: { lat, lng, place: place["place name"], state: place["state abbreviation"] },
      sites: (sites ?? []) as any[],
    };
  });
