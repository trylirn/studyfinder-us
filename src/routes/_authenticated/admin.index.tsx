import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminStats, runStudyImport, refreshDirectoryCounts } from "@/lib/import.functions";
import { listPendingClaims, decideClinicClaim, getClaimProofUrls } from "@/lib/clinics.functions";
import { supabase } from "@/integrations/supabase/client";
import { FileText, ExternalLink } from "lucide-react";

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
      qc.invalidateQueries();
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
          Auto-import: scheduled every 6 hours via pg_cron. Directory counts refresh nightly.
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
        <p className="mt-1 text-sm text-muted-foreground">
          Approve clinic operator requests. Approval grants the user a clinic_admin role and ownership of the clinic profile.
          Review each claimant's proof documents before deciding.
        </p>
        <ul className="mt-4 space-y-3 text-sm">
          {(claims ?? []).map((c: any) => (
            <ClaimRow key={c.id} claim={c} decide={decide} />
          ))}
          {(claims ?? []).length === 0 && <li className="text-muted-foreground">No pending claims.</li>}
        </ul>
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Recent import runs</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Started</th>
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
                <tr><td colSpan={6} className="py-3 text-center text-muted-foreground">No imports yet — run the quick sync above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ClaimRow({ claim: c, decide }: { claim: any; decide: any }) {
  const [showProof, setShowProof] = useState(false);
  const { data: proofs } = useQuery({
    queryKey: ["claim-proof", c.id],
    queryFn: () => getClaimProofUrls({ data: { paths: c.proof_paths ?? [] } }),
    enabled: showProof && Array.isArray(c.proof_paths) && c.proof_paths.length > 0,
  });

  return (
    <li className="rounded-md border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{c.clinics?.name ?? c.clinic_id}</p>
          <p className="text-xs text-muted-foreground">
            {[c.clinics?.city, c.clinics?.state].filter(Boolean).join(", ")}
          </p>
          <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
            <p><span className="text-muted-foreground">Contact:</span> {c.contact_name} ({c.contact_email})</p>
            {c.contact_phone && <p><span className="text-muted-foreground">Phone:</span> {c.contact_phone}</p>}
            {c.role && <p><span className="text-muted-foreground">Role:</span> {c.role}</p>}
            {c.relationship && <p><span className="text-muted-foreground">Relationship:</span> {c.relationship}</p>}
            {c.npi && <p><span className="text-muted-foreground">NPI:</span> {c.npi}</p>}
            {c.work_website && /^https?:\/\//i.test(c.work_website) && (
              <p>
                <span className="text-muted-foreground">Website:</span>{" "}
                <a href={c.work_website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {c.work_website}
                </a>
              </p>
            )}

            <p><span className="text-muted-foreground">Attested:</span> {c.attested ? "Yes" : "No"}</p>
          </div>
          {c.note && <p className="mt-2 rounded border border-border bg-muted/40 p-2 text-xs italic">"{c.note}"</p>}

          {Array.isArray(c.proof_paths) && c.proof_paths.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowProof((s) => !s)}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <FileText className="h-3 w-3" />
                {showProof ? "Hide" : "View"} {c.proof_paths.length} proof document{c.proof_paths.length === 1 ? "" : "s"}
              </button>
              {showProof && (
                <ul className="mt-2 space-y-1">
                  {(proofs ?? []).map((p: any) => (
                    <li key={p.path} className="text-xs">
                      {p.url ? (
                        <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" />
                          {p.path.split("/").pop()}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">{p.path} (unavailable)</span>
                      )}
                    </li>
                  ))}
                  {(!proofs || proofs.length === 0) && (
                    <li className="text-xs text-muted-foreground">Generating signed URLs…</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <button
            disabled={decide.isPending}
            onClick={() => decide.mutate({ claimId: c.id, decision: "approved" })}
            className="rounded-md bg-success px-3 py-1.5 text-xs font-medium text-success-foreground disabled:opacity-50"
          >
            Approve
          </button>
          <button
            disabled={decide.isPending}
            onClick={() => decide.mutate({ claimId: c.id, decision: "rejected" })}
            className="rounded-md border border-border px-3 py-1.5 text-xs disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>
    </li>
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
