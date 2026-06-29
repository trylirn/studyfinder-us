import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminStats, runStudyImport, refreshDirectoryCounts } from "@/lib/import.functions";
import { listPendingClaims, decideClinicClaim } from "@/lib/clinics.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
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
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const { data: claims } = useQuery({ queryKey: ["pending-claims"], queryFn: () => listPendingClaims() });
  const decide = useMutation({
    mutationFn: (input: { claimId: string; decision: "approved" | "rejected" }) =>
      decideClinicClaim({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending-claims"] }),
  });

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
        <button
          onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
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
        <h2 className="text-lg font-semibold">Clinic claim queue</h2>
        <p className="mt-1 text-sm text-muted-foreground">Approve clinic operator requests. Approval grants the user a clinic_admin role and ownership of the clinic profile.</p>
        <ul className="mt-4 space-y-2 text-sm">
          {(claims ?? []).map((c: any) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background p-3">
              <div className="min-w-0">
                <p className="font-medium">{c.clinics?.name ?? c.clinic_id}</p>
                <p className="text-xs text-muted-foreground">
                  {[c.clinics?.city, c.clinics?.state].filter(Boolean).join(", ")} · {c.contact_name} ({c.contact_email})
                </p>
                {c.note && <p className="mt-1 text-xs">{c.note}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ claimId: c.id, decision: "approved" })}
                  className="rounded-md bg-success px-3 py-1.5 text-xs font-medium text-success-foreground"
                >
                  Approve
                </button>
                <button
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ claimId: c.id, decision: "rejected" })}
                  className="rounded-md border border-border px-3 py-1.5 text-xs"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
          {(claims ?? []).length === 0 && <li className="text-muted-foreground">No pending claims.</li>}
        </ul>
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Recent import runs</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(stats.runs as Array<{ id: string; started_at: string; status: string; inserted: number; updated: number }>).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
              <span>{new Date(r.started_at).toLocaleString()}</span>
              <span className="text-muted-foreground">{r.status}</span>
              <span className="text-muted-foreground">+{r.inserted} new, {r.updated} updated</span>
            </li>
          ))}
          {stats.runs.length === 0 && <li className="text-muted-foreground">No imports yet — run the quick sync above.</li>}
        </ul>
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
