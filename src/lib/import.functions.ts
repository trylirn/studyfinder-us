import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { slugify } from "@/lib/slug";

type CTGStudy = {
  protocolSection?: {
    identificationModule?: { nctId?: string; briefTitle?: string; officialTitle?: string };
    descriptionModule?: { briefSummary?: string; detailedDescription?: string };
    conditionsModule?: { conditions?: string[] };
    designModule?: { phases?: string[]; studyType?: string; enrollmentInfo?: { count?: number } };
    statusModule?: {
      overallStatus?: string;
      startDateStruct?: { date?: string };
      completionDateStruct?: { date?: string };
      lastUpdatePostDateStruct?: { date?: string };
    };
    sponsorCollaboratorsModule?: {
      leadSponsor?: { name?: string };
      collaborators?: { name?: string }[];
    };
    armsInterventionsModule?: { interventions?: { type?: string; name?: string; description?: string }[] };
    eligibilityModule?: {
      eligibilityCriteria?: string;
      sex?: string;
      minimumAge?: string;
      maximumAge?: string;
      stdAges?: string[];
    };
    contactsLocationsModule?: {
      locations?: {
        facility?: string;
        city?: string;
        state?: string;
        country?: string;
        zip?: string;
        status?: string;
        geoPoint?: { lat?: number; lon?: number };
      }[];
    };
  };
};

function ageToYears(input?: string): number | null {
  if (!input) return null;
  const m = input.match(/(\d+(?:\.\d+)?)\s*(year|month|week|day)/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const u = m[2].toLowerCase();
  if (u.startsWith("year")) return n;
  if (u.startsWith("month")) return n / 12;
  if (u.startsWith("week")) return n / 52;
  return n / 365;
}

function parseDate(s?: string): string | null {
  if (!s) return null;
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

const STATE_NAME_TO_SLUG: Record<string, string> = {};
const STATE_ABBR_TO_SLUG: Record<string, string> = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureStateMaps(sb: any) {
  if (Object.keys(STATE_NAME_TO_SLUG).length > 0) return;
  const { data } = await sb.from("states").select("slug,name,abbr");
  for (const s of (data ?? []) as { slug: string; name: string; abbr: string }[]) {
    STATE_NAME_TO_SLUG[s.name.toLowerCase()] = s.slug;
    STATE_ABBR_TO_SLUG[s.abbr.toUpperCase()] = s.slug;
  }
}

function normalizeState(raw?: string): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  return STATE_NAME_TO_SLUG[t.toLowerCase()] ?? STATE_ABBR_TO_SLUG[t.toUpperCase()] ?? null;
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: roleRow } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) throw new Error("Forbidden: admin only");
}

export const runStudyImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        pages: z.number().int().min(1).max(200).optional().default(15),
        pageSize: z.number().int().min(10).max(1000).optional().default(200),
        // legacy compat
        maxPages: z.number().int().min(1).max(200).optional(),
        recruitingOnly: z.boolean().optional(),
        status: z.string().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await ensureStateMaps(supabaseAdmin);

    const maxPages = data.maxPages ?? data.pages;
    const statusFilter = data.status ?? (data.recruitingOnly === false ? "" : "RECRUITING");

    const { data: runRow, error: runErr } = await supabaseAdmin
      .from("import_runs")
      .insert({ status: "running", params: data })
      .select("id")
      .single();
    if (runErr) throw new Error(runErr.message);
    const runId = runRow.id;

    let inserted = 0;
    let updated = 0;
    let pages = 0;
    let nextToken: string | null = null;
    const cityCounter = new Map<string, { name: string; state_slug: string; count: number }>();
    const stateCounter = new Map<string, number>();
    const conditionCounter = new Map<string, { name: string; count: number }>();
    const sponsorCounter = new Map<string, { name: string; count: number }>();

    try {
      for (let page = 0; page < maxPages; page++) {
        const params = new URLSearchParams({
          format: "json",
          pageSize: String(data.pageSize),
          countTotal: "false",
          "query.locn": "United States",
          fields:
            "protocolSection.identificationModule,protocolSection.descriptionModule,protocolSection.conditionsModule,protocolSection.designModule,protocolSection.statusModule,protocolSection.sponsorCollaboratorsModule,protocolSection.armsInterventionsModule,protocolSection.eligibilityModule,protocolSection.contactsLocationsModule",
        });
        if (statusFilter) params.set("filter.overallStatus", statusFilter);
        if (nextToken) params.set("pageToken", nextToken);

        const res = await fetch(`https://clinicaltrials.gov/api/v2/studies?${params}`);
        if (!res.ok) throw new Error(`ClinicalTrials.gov HTTP ${res.status}`);
        const body = (await res.json()) as { studies?: CTGStudy[]; nextPageToken?: string };
        const studies = body.studies ?? [];
        pages++;

        const rows = [];
        const locationRows = [];
        for (const s of studies) {
          const ps = s.protocolSection ?? {};
          const id = ps.identificationModule?.nctId;
          if (!id) continue;
          const conditions = ps.conditionsModule?.conditions ?? [];
          const conditionSlugs = conditions.map(slugify).filter(Boolean);
          for (const i in conditions) {
            const slug = conditionSlugs[i];
            if (!slug) continue;
            const cur = conditionCounter.get(slug) ?? { name: conditions[i], count: 0 };
            cur.count++;
            conditionCounter.set(slug, cur);
          }
          const sponsorName = ps.sponsorCollaboratorsModule?.leadSponsor?.name ?? null;
          const sponsorSlug = sponsorName ? slugify(sponsorName) : null;
          if (sponsorSlug && sponsorName) {
            const cur = sponsorCounter.get(sponsorSlug) ?? { name: sponsorName, count: 0 };
            cur.count++;
            sponsorCounter.set(sponsorSlug, cur);
          }
          const locs = ps.contactsLocationsModule?.locations ?? [];
          const stateSlugSet = new Set<string>();
          const citySlugSet = new Set<string>();
          const locInsert: any[] = [];
          for (const l of locs) {
            if ((l.country ?? "").trim() !== "United States") continue;
            const stateSlug = normalizeState(l.state);
            const cityName = (l.city ?? "").trim();
            const citySlug = cityName && stateSlug ? `${slugify(cityName)}-${stateSlug}` : null;
            if (stateSlug) {
              stateSlugSet.add(stateSlug);
              stateCounter.set(stateSlug, (stateCounter.get(stateSlug) ?? 0) + 1);
            }
            if (citySlug && stateSlug && cityName) {
              citySlugSet.add(citySlug);
              const cur = cityCounter.get(citySlug) ?? { name: cityName, state_slug: stateSlug, count: 0 };
              cur.count++;
              cityCounter.set(citySlug, cur);
            }
            locInsert.push({
              facility: l.facility ?? null,
              city: cityName || null,
              city_slug: citySlug,
              state: l.state ?? null,
              state_slug: stateSlug,
              country: l.country ?? null,
              zip: l.zip ?? null,
              status: l.status ?? null,
              lat: typeof l.geoPoint?.lat === "number" ? l.geoPoint.lat : null,
              lng: typeof l.geoPoint?.lon === "number" ? l.geoPoint.lon : null,
            });
          }

          rows.push({
            nct_id: id,
            title: ps.identificationModule?.briefTitle ?? ps.identificationModule?.officialTitle ?? "Untitled study",
            brief_summary: ps.descriptionModule?.briefSummary ?? null,
            detailed_description: ps.descriptionModule?.detailedDescription ?? null,
            phase: (ps.designModule?.phases ?? []).join("|") || null,
            overall_status: ps.statusModule?.overallStatus ?? null,
            study_type: ps.designModule?.studyType ?? null,
            conditions,
            condition_slugs: conditionSlugs,
            interventions: (ps.armsInterventionsModule?.interventions ?? []) as unknown as object,
            eligibility: {
              criteria: ps.eligibilityModule?.eligibilityCriteria ?? null,
              sex: ps.eligibilityModule?.sex ?? null,
              minimumAge: ps.eligibilityModule?.minimumAge ?? null,
              maximumAge: ps.eligibilityModule?.maximumAge ?? null,
              stdAges: ps.eligibilityModule?.stdAges ?? [],
            } as unknown as object,
            min_age_years: ageToYears(ps.eligibilityModule?.minimumAge),
            max_age_years: ageToYears(ps.eligibilityModule?.maximumAge),
            gender: ps.eligibilityModule?.sex ?? null,
            sponsor_name: sponsorName,
            sponsor_slug: sponsorSlug,
            collaborators: (ps.sponsorCollaboratorsModule?.collaborators ?? []).map((c) => c.name).filter(Boolean) as string[],
            start_date: parseDate(ps.statusModule?.startDateStruct?.date),
            completion_date: parseDate(ps.statusModule?.completionDateStruct?.date),
            last_update_posted: parseDate(ps.statusModule?.lastUpdatePostDateStruct?.date),
            enrollment: ps.designModule?.enrollmentInfo?.count ?? null,
            state_slugs: [...stateSlugSet],
            city_slugs: [...citySlugSet],
          });
          for (const li of locInsert) locationRows.push({ ...li, nct_id: id });
        }

        if (rows.length > 0) {
          const ids = rows.map((r) => r.nct_id);
          const { data: existing } = await supabaseAdmin.from("studies").select("nct_id").in("nct_id", ids);
          const existingSet = new Set((existing ?? []).map((e: any) => e.nct_id));
          inserted += rows.filter((r) => !existingSet.has(r.nct_id)).length;
          updated += rows.filter((r) => existingSet.has(r.nct_id)).length;

          const { error: upErr } = await supabaseAdmin.from("studies").upsert(rows as any, { onConflict: "nct_id" });
          if (upErr) throw new Error(`studies upsert: ${upErr.message}`);
          await supabaseAdmin.from("locations").delete().in("nct_id", ids);
          if (locationRows.length > 0) {
            const { error: locErr } = await supabaseAdmin.from("locations").insert(locationRows);
            if (locErr) throw new Error(`locations insert: ${locErr.message}`);
          }
        }

        nextToken = body.nextPageToken ?? null;
        if (!nextToken) break;
      }

      // Upsert dimension rows. study_count is then refreshed authoritatively below.
      const condUpserts = [...conditionCounter.entries()].map(([slug, v]) => ({ slug, name: v.name, study_count: v.count }));
      const sponsorUpserts = [...sponsorCounter.entries()].map(([slug, v]) => ({ slug, name: v.name, study_count: v.count }));
      const cityUpserts = [...cityCounter.entries()].map(([slug, v]) => ({ slug, name: v.name, state_slug: v.state_slug, study_count: v.count }));

      if (condUpserts.length) await supabaseAdmin.from("conditions").upsert(condUpserts, { onConflict: "slug" });
      if (sponsorUpserts.length) await supabaseAdmin.from("sponsors").upsert(sponsorUpserts, { onConflict: "slug" });
      if (cityUpserts.length) await supabaseAdmin.from("cities").upsert(cityUpserts, { onConflict: "slug" });

      // Generate clinic rows from new locations, then refresh accurate counts.
      const { error: genErr } = await supabaseAdmin.rpc("generate_clinics_from_locations");
      if (genErr) console.error("generate_clinics_from_locations:", genErr.message);
      const { error: refErr } = await supabaseAdmin.rpc("refresh_directory_counts");
      if (refErr) console.error("refresh_directory_counts:", refErr.message);

      await supabaseAdmin
        .from("import_runs")
        .update({ status: "ok", finished_at: new Date().toISOString(), inserted, updated, pages })
        .eq("id", runId);

      return { ok: true, inserted, updated, pages };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabaseAdmin
        .from("import_runs")
        .update({ status: "error", error: msg, finished_at: new Date().toISOString(), inserted, updated, pages })
        .eq("id", runId);
      throw e;
    }
  });

export const refreshDirectoryCounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: g } = await supabaseAdmin.rpc("generate_clinics_from_locations");
    if (g) throw new Error(g.message);
    const { error: r } = await supabaseAdmin.rpc("refresh_directory_counts");
    if (r) throw new Error(r.message);
    return { ok: true };
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [studies, conditions, sponsors, cities, clinics, recruiting, runs] = await Promise.all([
      supabaseAdmin.from("studies").select("nct_id", { count: "exact", head: true }),
      supabaseAdmin.from("conditions").select("slug", { count: "exact", head: true }).gt("study_count", 0),
      supabaseAdmin.from("sponsors").select("slug", { count: "exact", head: true }).gt("study_count", 0),
      supabaseAdmin.from("cities").select("slug", { count: "exact", head: true }).gt("study_count", 0),
      supabaseAdmin.from("clinics").select("id", { count: "exact", head: true }).eq("published", true),
      supabaseAdmin.from("studies").select("nct_id", { count: "exact", head: true }).eq("overall_status", "RECRUITING"),
      supabaseAdmin.from("import_runs").select("*").order("started_at", { ascending: false }).limit(10),
    ]);
    return {
      totalStudies: studies.count ?? 0,
      totalConditions: conditions.count ?? 0,
      totalSponsors: sponsors.count ?? 0,
      totalCities: cities.count ?? 0,
      totalClinics: clinics.count ?? 0,
      totalRecruiting: recruiting.count ?? 0,
      runs: runs.data ?? [],
    };
  });
