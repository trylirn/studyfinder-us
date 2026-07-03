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

/**
 * Stateless matcher: takes a condition, ZIP, and optional eligibility filters,
 * returns clinics near the user that run at least one matching trial.
 * Nothing is persisted.
 */
export const matchTrialSites = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        condition: z.string().min(1).max(120),
        conditionName: z.string().max(200).optional().default(""),
        zip: z.string().regex(/^\d{5}$/),
        radius: z.coerce.number().min(5).max(500).default(50),
        phase: z.string().optional().default(""),
        recruitingOnly: z.coerce.boolean().optional().default(true),
        // About-you (all optional)
        age: z.coerce.number().min(0).max(120).optional(),
        sex: z.enum(["MALE", "FEMALE", ""]).optional().default(""),
        healthyVolunteer: z.coerce.boolean().optional().default(false),
        // Trial preferences (all optional)
        studyType: z.enum(["INTERVENTIONAL", "OBSERVATIONAL", ""]).optional().default(""),
        acceptsPlacebo: z.coerce.boolean().optional().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();

    // Resolve ZIP -> lat/lng
    const res = await fetch(`https://api.zippopotam.us/us/${data.zip}`);
    if (!res.ok) return { ok: false as const, reason: "ZIP code not found. Please double-check and try again." };
    const body = (await res.json()) as { places?: { latitude: string; longitude: string; "place name": string; "state abbreviation": string }[] };
    const place = body.places?.[0];
    if (!place) return { ok: false as const, reason: "ZIP code not found. Please double-check and try again." };
    const lat = parseFloat(place.latitude);
    const lng = parseFloat(place.longitude);
    const origin = { lat, lng, place: place["place name"], state: place["state abbreviation"] };

    // Broad study query: condition slug OR text-search on condition name
    let sq: any = sb
      .from("studies")
      .select("nct_id,title,phase,overall_status,sponsor_name,study_type,min_age_years,max_age_years,gender,eligibility")
      .not("brief_summary", "is", null);
    if (data.conditionName && data.conditionName.length > 2) {
      // Match either exact slug OR text-search hit — better recall for synonyms
      const safe = data.conditionName.replace(/[^\w\s-]/g, " ").trim();
      sq = sq.or(`condition_slugs.cs.{${data.condition}},search_tsv.fts.${safe}`);
    } else {
      sq = sq.contains("condition_slugs", [data.condition]);
    }
    if (data.recruitingOnly) sq = sq.eq("overall_status", "RECRUITING");
    if (data.phase) sq = sq.ilike("phase", `%PHASE${data.phase}%`);
    if (data.studyType) sq = sq.eq("study_type", data.studyType);
    sq = sq.limit(1000);
    const { data: studies, error: sErr } = await sq;
    if (sErr) return { ok: false as const, reason: sErr.message };

    // Apply age / sex / healthy-volunteer / placebo filters client-side (nullable-safe)
    const filtered = (studies ?? []).filter((s: any) => {
      if (typeof data.age === "number") {
        if (s.min_age_years != null && data.age < Number(s.min_age_years)) return false;
        if (s.max_age_years != null && data.age > Number(s.max_age_years)) return false;
      }
      if (data.sex) {
        const g = String(s.gender ?? "ALL").toUpperCase();
        if (g !== "ALL" && g !== data.sex) return false;
      }
      const elig = s.eligibility ?? {};
      if (data.healthyVolunteer) {
        const crit = String(elig.criteria ?? "").toLowerCase();
        // Only require a study to explicitly not exclude healthy volunteers when the user IS one
        if (crit.includes("must have") && !crit.includes("healthy")) return false;
      }
      if (!data.acceptsPlacebo) {
        const crit = String(elig.criteria ?? "").toLowerCase();
        if (crit.includes("placebo")) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      return { ok: true as const, origin, results: [], matchedCount: 0, totalNearby: 0, fallback: [] as any[] };
    }
    const nctIds = filtered.map((s: any) => s.nct_id);
    const studyMap = new Map<string, any>(filtered.map((s: any) => [s.nct_id, s]));

    // Nearby sites within radius
    const { data: sites, error: nErr } = await sb.rpc("nearby_sites", {
      _lat: lat,
      _lng: lng,
      _radius_mi: data.radius,
    });
    if (nErr) return { ok: false as const, reason: nErr.message };

    const totalNearby = new Set((sites ?? []).map((s: any) => s.clinic_id).filter(Boolean)).size;

    // Keep only sites that host a matching study AND belong to a known clinic
    const eligibleSites = (sites ?? []).filter(
      (s: any) => s.clinic_id && nctIds.includes(s.nct_id),
    );

    // Group by clinic
    const byClinic = new Map<string, { distance_mi: number; trials: Map<string, any> }>();
    for (const s of eligibleSites) {
      const key = s.clinic_id as string;
      const study = studyMap.get(s.nct_id);
      if (!study) continue;
      const cur = byClinic.get(key) ?? { distance_mi: s.distance_mi, trials: new Map() };
      cur.distance_mi = Math.min(cur.distance_mi, s.distance_mi);
      cur.trials.set(s.nct_id, study);
      byClinic.set(key, cur);
    }

    const clinicIds = [...byClinic.keys()];
    let results: any[] = [];
    if (clinicIds.length > 0) {
      const { data: clinics } = await sb
        .from("clinics")
        .select("id,slug,name,city,state,zip,recruiting_count")
        .in("id", clinicIds)
        .eq("published", true);
      results = (clinics ?? [])
        .map((c: any) => {
          const entry = byClinic.get(c.id)!;
          return {
            clinic: c,
            distance_mi: entry.distance_mi,
            trials: [...entry.trials.values()].slice(0, 8),
            trial_count: entry.trials.size,
          };
        })
        .sort((a, b) => a.distance_mi - b.distance_mi || b.trial_count - a.trial_count)
        .slice(0, 30);
    }

    // If no exact matches, provide a fallback list of the nearest clinics running
    // ANY study for this condition (ignoring optional eligibility filters).
    let fallback: any[] = [];
    if (results.length === 0) {
      const { data: broadStudies } = await sb
        .from("studies")
        .select("nct_id,title,overall_status,phase,sponsor_name")
        .contains("condition_slugs", [data.condition])
        .not("brief_summary", "is", null)
        .limit(1000);
      const broadIds = new Set((broadStudies ?? []).map((s: any) => s.nct_id));
      const bMap = new Map<string, any>((broadStudies ?? []).map((s: any) => [s.nct_id, s]));
      const fbByClinic = new Map<string, { distance_mi: number; trials: Map<string, any> }>();
      for (const s of (sites ?? [])) {
        if (!s.clinic_id || !broadIds.has(s.nct_id)) continue;
        const cur = fbByClinic.get(s.clinic_id) ?? { distance_mi: s.distance_mi, trials: new Map() };
        cur.distance_mi = Math.min(cur.distance_mi, s.distance_mi);
        cur.trials.set(s.nct_id, bMap.get(s.nct_id));
        fbByClinic.set(s.clinic_id, cur);
      }
      const fbIds = [...fbByClinic.keys()];
      if (fbIds.length > 0) {
        const { data: fbClinics } = await sb
          .from("clinics")
          .select("id,slug,name,city,state,zip,recruiting_count")
          .in("id", fbIds)
          .eq("published", true);
        fallback = (fbClinics ?? [])
          .map((c: any) => {
            const entry = fbByClinic.get(c.id)!;
            return {
              clinic: c,
              distance_mi: entry.distance_mi,
              trials: [...entry.trials.values()].slice(0, 5),
              trial_count: entry.trials.size,
            };
          })
          .sort((a, b) => a.distance_mi - b.distance_mi)
          .slice(0, 10);
      }
    }

    return {
      ok: true as const,
      origin,
      results,
      matchedCount: results.length,
      totalNearby,
      fallback,
    };
  });
