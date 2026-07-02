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
 * Stateless matcher: takes a condition slug, ZIP code, and filters,
 * returns clinics near the user that run at least one matching trial.
 * Nothing is persisted.
 */
export const matchTrialSites = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        condition: z.string().min(1).max(120),
        zip: z.string().regex(/^\d{5}$/),
        radius: z.coerce.number().min(5).max(500).default(50),
        phase: z.string().optional().default(""),
        recruitingOnly: z.coerce.boolean().optional().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();

    // Resolve ZIP -> lat/lng
    const res = await fetch(`https://api.zippopotam.us/us/${data.zip}`);
    if (!res.ok) return { ok: false as const, reason: "ZIP not found" };
    const body = (await res.json()) as { places?: { latitude: string; longitude: string; "place name": string; "state abbreviation": string }[] };
    const place = body.places?.[0];
    if (!place) return { ok: false as const, reason: "ZIP not found" };
    const lat = parseFloat(place.latitude);
    const lng = parseFloat(place.longitude);

    // Find studies matching the condition
    let sq: any = sb
      .from("studies")
      .select("nct_id,title,phase,overall_status,sponsor_name")
      .contains("condition_slugs", [data.condition])
      .not("brief_summary", "is", null);
    if (data.recruitingOnly) sq = sq.eq("overall_status", "RECRUITING");
    if (data.phase) sq = sq.ilike("phase", `%PHASE${data.phase}%`);
    sq = sq.limit(500);
    const { data: studies, error: sErr } = await sq;
    if (sErr) return { ok: false as const, reason: sErr.message };
    if (!studies || studies.length === 0) {
      return { ok: true as const, origin: { lat, lng, place: place["place name"], state: place["state abbreviation"] }, results: [] };
    }
    const nctIds = studies.map((s: any) => s.nct_id);
    const studyMap = new Map<string, any>(studies.map((s: any) => [s.nct_id, s]));

    // Nearby sites within radius
    const { data: sites, error: nErr } = await sb.rpc("nearby_sites", {
      _lat: lat,
      _lng: lng,
      _radius_mi: data.radius,
    });
    if (nErr) return { ok: false as const, reason: nErr.message };

    // Keep only sites that host a matching study AND belong to a known clinic
    const eligibleSites = (sites ?? []).filter(
      (s: any) => s.clinic_id && nctIds.includes(s.nct_id),
    );
    if (eligibleSites.length === 0) {
      return { ok: true as const, origin: { lat, lng, place: place["place name"], state: place["state abbreviation"] }, results: [] };
    }

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
    const { data: clinics } = await sb
      .from("clinics")
      .select("id,slug,name,city,state,zip,recruiting_count")
      .in("id", clinicIds)
      .eq("published", true);

    const results = (clinics ?? [])
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

    return {
      ok: true as const,
      origin: { lat, lng, place: place["place name"], state: place["state abbreviation"] },
      results,
    };
  });
