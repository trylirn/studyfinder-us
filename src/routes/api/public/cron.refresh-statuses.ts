import { createFileRoute } from "@tanstack/react-router";

function parseDate(s?: string): string | null {
  if (!s) return null;
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index++) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

async function authorized(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const presented = bearer || request.headers.get("x-cron-secret");
  if (!presented) return false;

  const environmentSecret = process.env.CRON_SECRET;
  if (environmentSecret && safeEqual(presented, environmentSecret)) return true;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("automation_secrets")
    .select("secret")
    .eq("name", "study_import_cron")
    .maybeSingle();
  return typeof data?.secret === "string" && safeEqual(presented, data.secret);
}

export const Route = createFileRoute("/api/public/cron/refresh-statuses")({
  server: {
    handlers: {
      GET: async ({ request }) => runStatusRefresh(request),
      POST: async ({ request }) => runStatusRefresh(request),
    },
  },
});

type CTGStudy = {
  protocolSection?: {
    identificationModule?: { nctId?: string };
    statusModule?: {
      overallStatus?: string;
      completionDateStruct?: { date?: string };
      lastUpdatePostDateStruct?: { date?: string };
    };
  };
};

async function runStatusRefresh(request: Request) {
  if (!(await authorized(request))) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 800), 50), 3000);
  const batchSize = 50;

  const { data: runRow, error: runErr } = await supabaseAdmin
    .from("import_runs")
    .insert({ status: "running", params: { automated: true, mode: "status_refresh", limit } })
    .select("id")
    .single();
  if (runErr) return Response.json({ ok: false, error: runErr.message }, { status: 500 });

  let checked = 0;
  let changed = 0;
  let batches = 0;

  try {
    // Oldest-checked studies that are still shown as open/active in the directory.
    const { data: candidates, error: candErr } = await supabaseAdmin
      .from("studies")
      .select("nct_id, overall_status")
      .in("overall_status", ["RECRUITING", "NOT_YET_RECRUITING", "ENROLLING_BY_INVITATION", "ACTIVE_NOT_RECRUITING", "SUSPENDED"])
      .order("updated_at", { ascending: true })
      .limit(limit);
    if (candErr) throw new Error(candErr.message);

    const rows = candidates ?? [];
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const params = new URLSearchParams({
        format: "json",
        pageSize: String(batchSize),
        countTotal: "false",
        "filter.ids": batch.map((r) => r.nct_id).join(","),
        fields: "protocolSection.identificationModule,protocolSection.statusModule",
      });
      const res = await fetch(`https://clinicaltrials.gov/api/v2/studies?${params}`);
      if (!res.ok) throw new Error(`ClinicalTrials.gov HTTP ${res.status}`);
      const body = (await res.json()) as { studies?: CTGStudy[] };
      batches++;

      const previous = new Map(batch.map((r) => [r.nct_id, r.overall_status]));
      for (const s of body.studies ?? []) {
        const id = s.protocolSection?.identificationModule?.nctId;
        const status = s.protocolSection?.statusModule?.overallStatus ?? null;
        if (!id || !previous.has(id)) continue;
        checked++;
        const { error: upErr } = await supabaseAdmin
          .from("studies")
          .update({
            overall_status: status,
            completion_date: parseDate(s.protocolSection?.statusModule?.completionDateStruct?.date),
            last_update_posted: parseDate(s.protocolSection?.statusModule?.lastUpdatePostDateStruct?.date),
            updated_at: new Date().toISOString(),
          })
          .eq("nct_id", id);
        if (upErr) throw new Error(`status update: ${upErr.message}`);
        if (status !== previous.get(id)) changed++;
      }
    }

    await supabaseAdmin.rpc("refresh_directory_counts");
    await supabaseAdmin
      .from("import_runs")
      .update({ status: "ok", finished_at: new Date().toISOString(), inserted: 0, updated: changed, pages: batches })
      .eq("id", runRow.id);
    return Response.json({ ok: true, checked, changed, batches });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await supabaseAdmin
      .from("import_runs")
      .update({ status: "error", error, finished_at: new Date().toISOString(), updated: changed, pages: batches })
      .eq("id", runRow.id);
    return Response.json({ ok: false, error }, { status: 500 });
  }
}
