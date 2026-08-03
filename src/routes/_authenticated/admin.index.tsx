import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getAdminStats, runStudyImport, refreshDirectoryCounts } from "@/lib/import.functions";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin — TrialFinderUS" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  loader: () => getAdminStats(),
  component: AdminPage,
});

function AdminPage() {
  const stats = Route.useLoaderData();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const latestAutomated = (stats.runs as Array<any>).find((run) => run.params?.automated === true);


  async function runImport(pages: number, recruitingOnly: boolean) {
    setBusy(true);
    try {
      const res = await runStudyImport({ data: { pages, pageSize: 100, recruitingOnly } });
      setLog((l) => [`Imported ${res.inserted} new, updated ${res.updated} (over ${res.pages} pages)`, ...l]);
    } catch (e) {
      setLog((l) => [`Error: ${(e as Error).message}`, ...l]);
    } finally {
      setBusy(false);
    }

  }

  async function regenerate() {
    setBusy(true);
    try {
      await refreshDirectoryCounts();
      setLog((l) => ["Regenerated clinics and refreshed all directory counts.", ...l]);
    } catch (e) {
      setLog((l) => [`Error: ${(e as Error).message}`, ...l]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <div className="flex items-center gap-4">
        <Link to="/admin/analytics" className="text-sm text-primary hover:underline">Analytics</Link>
        <button
          onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
        </div>
      </div>


      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Total studies" value={stats.totalStudies} />
        <Stat label="Recruiting" value={stats.totalRecruiting} />
        <Stat label="Conditions" value={stats.totalConditions} />
        <Stat label="Sponsors" value={stats.totalSponsors} />
        <Stat label="Clinics" value={stats.totalClinics} />
      </div>

      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Import studies from ClinicalTrials.gov</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fetch the latest studies via the public v2 API. Records are deduplicated by NCT ID and re-indexed for SEO pages.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Automatic sync runs every 6 hours; directory counts refresh nightly.
          {latestAutomated
            ? ` Last automated run: ${new Date(latestAutomated.started_at).toLocaleString()} (${latestAutomated.status}).`
            : " No automated run has completed yet."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => runImport(5, true)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            Quick: 500 recruiting
          </button>
          <button disabled={busy} onClick={() => runImport(20, true)} className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50">
            Sync 2,000 recruiting
          </button>
          <button disabled={busy} onClick={() => runImport(50, false)} className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50">
            Sync 5,000 (all statuses)
          </button>
          <button disabled={busy} onClick={regenerate} className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50">
            Regenerate clinics + counts
          </button>
        </div>
        {busy && <p className="mt-3 text-sm text-muted-foreground">Working… this may take 30–90 seconds.</p>}
        {log.length > 0 && (
          <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
            {log.map((l, i) => <li key={i}>• {l}</li>)}
          </ul>
        )}
      </section>




      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Recent import runs</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Started</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Pages</th>
                <th className="pb-2 pr-4 font-medium">New</th>
                <th className="pb-2 pr-4 font-medium">Updated</th>
                <th className="pb-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {(stats.runs as Array<any>).map((r) => (
                <tr key={r.id} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-4 text-xs">{new Date(r.started_at).toLocaleString()}</td>
                   <td className="py-2 pr-4 text-xs text-muted-foreground">{r.params?.automated ? "Automatic" : "Manual"}</td>
                   <td className="py-2 pr-4">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                      r.status === "ok" ? "bg-success/10 text-success" :
                      r.status === "error" ? "bg-destructive/10 text-destructive" :
                      "bg-muted text-muted-foreground"
                    }`}>{r.status}</span>
                  </td>
                  <td className="py-2 pr-4 text-xs text-muted-foreground">{r.pages ?? 0}</td>
                  <td className="py-2 pr-4 text-xs">+{r.inserted ?? 0}</td>
                  <td className="py-2 pr-4 text-xs text-muted-foreground">{r.updated ?? 0}</td>
                  <td className="py-2 max-w-[240px] truncate text-xs text-muted-foreground" title={r.error ?? ""}>
                    {r.error ?? (r.finished_at ? `done in ${Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000)}s` : "—")}
                  </td>
                </tr>
              ))}
              {stats.runs.length === 0 && (
                 <tr><td colSpan={7} className="py-3 text-center text-muted-foreground">No imports have run yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}


function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}
