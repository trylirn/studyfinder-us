import { createFileRoute } from "@tanstack/react-router";
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
    sponsorCollaboratorsModule?: { leadSponsor?: { name?: string }; collaborators?: { name?: string }[] };
    armsInterventionsModule?: { interventions?: { type?: string; name?: string; description?: string }[] };
    eligibilityModule?: { eligibilityCriteria?: string; sex?: string; minimumAge?: string; maximumAge?: string; stdAges?: string[] };
    contactsLocationsModule?: {
      locations?: { facility?: string; city?: string; state?: string; country?: string; zip?: string; status?: string; geoPoint?: { lat?: number; lon?: number } }[];
    };
  };
};

function ageToYears(input?: string): number | null {
  const m = input?.match(/(\d+(?:\.\d+)?)\s*(year|month|week|day)/i);
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
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return auth === secret || request.headers.get("x-cron-secret") === secret;
}

export const Route = createFileRoute("/api/public/cron/import-studies")({
  server: {
    handlers: {
      GET: async ({ request }) => runCronImport(request),
      POST: async ({ request }) => runCronImport(request),
    },
  },
});

async function runCronImport(request: Request) {
  if (!authorized(request)) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const url = new URL(request.url);
  const pages = Math.min(Math.max(Number(url.searchParams.get("pages") ?? 5), 1), 25);
  const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? 100), 10), 1000);
  const status = url.searchParams.get("status") || "RECRUITING";

  const { data: states } = await supabaseAdmin.from("states").select("slug,name,abbr");
  const stateNameToSlug: Record<string, string> = {};
  const stateAbbrToSlug: Record<string, string> = {};
  for (const s of states ?? []) {
    stateNameToSlug[s.name.toLowerCase()] = s.slug;
    stateAbbrToSlug[s.abbr.toUpperCase()] = s.slug;
  }
  const normalizeState = (raw?: string) => raw ? stateNameToSlug[raw.trim().toLowerCase()] ?? stateAbbrToSlug[raw.trim().toUpperCase()] ?? null : null;

  const { data: runRow, error: runErr } = await supabaseAdmin
    .from("import_runs")
    .insert({ status: "running", params: { automated: true, pages, pageSize, status } })
    .select("id")
    .single();
  if (runErr) return Response.json({ ok: false, error: runErr.message }, { status: 500 });

  let inserted = 0;
  let updated = 0;
  let importedPages = 0;
  let nextToken: string | null = null;
  const conditionCounter = new Map<string, { name: string; count: number }>();
  const sponsorCounter = new Map<string, { name: string; count: number }>();
  const cityCounter = new Map<string, { name: string; state_slug: string; count: number }>();

  try {
    for (let page = 0; page < pages; page++) {
      const params = new URLSearchParams({
        format: "json",
        pageSize: String(pageSize),
        countTotal: "false",
        "query.locn": "United States",
        fields:
          "protocolSection.identificationModule,protocolSection.descriptionModule,protocolSection.conditionsModule,protocolSection.designModule,protocolSection.statusModule,protocolSection.sponsorCollaboratorsModule,protocolSection.armsInterventionsModule,protocolSection.eligibilityModule,protocolSection.contactsLocationsModule",
      });
      if (status) params.set("filter.overallStatus", status);
      if (nextToken) params.set("pageToken", nextToken);

      const res = await fetch(`https://clinicaltrials.gov/api/v2/studies?${params}`);
      if (!res.ok) throw new Error(`ClinicalTrials.gov HTTP ${res.status}`);
      const body = (await res.json()) as { studies?: CTGStudy[]; nextPageToken?: string };
      importedPages++;

      const rows = [];
      const locationRows = [];
      for (const s of body.studies ?? []) {
        const ps = s.protocolSection ?? {};
        const id = ps.identificationModule?.nctId;
        if (!id) continue;

        const conditions = ps.conditionsModule?.conditions ?? [];
        const conditionSlugs = conditions.map(slugify).filter(Boolean);
        conditions.forEach((name, i) => {
          const slug = conditionSlugs[i];
          if (!slug) return;
          const cur = conditionCounter.get(slug) ?? { name, count: 0 };
          cur.count++;
          conditionCounter.set(slug, cur);
        });

        const sponsorName = ps.sponsorCollaboratorsModule?.leadSponsor?.name ?? null;
        const sponsorSlug = sponsorName ? slugify(sponsorName) : null;
        if (sponsorSlug && sponsorName) {
          const cur = sponsorCounter.get(sponsorSlug) ?? { name: sponsorName, count: 0 };
          cur.count++;
          sponsorCounter.set(sponsorSlug, cur);
        }

        const stateSlugSet = new Set<string>();
        const citySlugSet = new Set<string>();
        const locInsert = [];
        for (const l of ps.contactsLocationsModule?.locations ?? []) {
          if ((l.country ?? "").trim() !== "United States") continue;
          const stateSlug = normalizeState(l.state);
          const cityName = (l.city ?? "").trim();
          const citySlug = cityName && stateSlug ? `${slugify(cityName)}-${stateSlug}` : null;
          if (stateSlug) stateSlugSet.add(stateSlug);
          if (citySlug && stateSlug && cityName) {
            citySlugSet.add(citySlug);
            const cur = cityCounter.get(citySlug) ?? { name: cityName, state_slug: stateSlug, count: 0 };
            cur.count++;
            cityCounter.set(citySlug, cur);
          }
          locInsert.push({
            nct_id: id,
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
          interventions: (ps.armsInterventionsModule?.interventions ?? []) as any,
          eligibility: {
            criteria: ps.eligibilityModule?.eligibilityCriteria ?? null,
            sex: ps.eligibilityModule?.sex ?? null,
            minimumAge: ps.eligibilityModule?.minimumAge ?? null,
            maximumAge: ps.eligibilityModule?.maximumAge ?? null,
            stdAges: ps.eligibilityModule?.stdAges ?? [],
          } as any,
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
        locationRows.push(...locInsert);
      }

      if (rows.length) {
        const ids = rows.map((r) => r.nct_id);
        const { data: existing } = await supabaseAdmin.from("studies").select("nct_id").in("nct_id", ids);
        const existingSet = new Set((existing ?? []).map((e) => e.nct_id));
        inserted += rows.filter((r) => !existingSet.has(r.nct_id)).length;
        updated += rows.filter((r) => existingSet.has(r.nct_id)).length;

        const { error: upErr } = await supabaseAdmin.from("studies").upsert(rows as any, { onConflict: "nct_id" });
        if (upErr) throw new Error(`studies upsert: ${upErr.message}`);
        await supabaseAdmin.from("locations").delete().in("nct_id", ids);
        if (locationRows.length) {
          const { error: locErr } = await supabaseAdmin.from("locations").insert(locationRows);
          if (locErr) throw new Error(`locations insert: ${locErr.message}`);
        }
      }

      nextToken = body.nextPageToken ?? null;
      if (!nextToken) break;
    }

    const condUpserts = [...conditionCounter.entries()].map(([slug, v]) => ({ slug, name: v.name, study_count: v.count }));
    const sponsorUpserts = [...sponsorCounter.entries()].map(([slug, v]) => ({ slug, name: v.name, study_count: v.count }));
    const cityUpserts = [...cityCounter.entries()].map(([slug, v]) => ({ slug, name: v.name, state_slug: v.state_slug, study_count: v.count }));
    if (condUpserts.length) await supabaseAdmin.from("conditions").upsert(condUpserts, { onConflict: "slug" });
    if (sponsorUpserts.length) await supabaseAdmin.from("sponsors").upsert(sponsorUpserts, { onConflict: "slug" });
    if (cityUpserts.length) await supabaseAdmin.from("cities").upsert(cityUpserts, { onConflict: "slug" });

    await supabaseAdmin.rpc("generate_clinics_from_locations");
    await supabaseAdmin.rpc("refresh_directory_counts");
    await supabaseAdmin.from("import_runs").update({ status: "ok", finished_at: new Date().toISOString(), inserted, updated, pages: importedPages }).eq("id", runRow.id);
    return Response.json({ ok: true, inserted, updated, pages: importedPages });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await supabaseAdmin.from("import_runs").update({ status: "error", error, finished_at: new Date().toISOString(), inserted, updated, pages: importedPages }).eq("id", runRow.id);
    return Response.json({ ok: false, error }, { status: 500 });
  }
}