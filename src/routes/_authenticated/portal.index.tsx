import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPortalDashboard } from "@/lib/clinics.functions";
import { Hospital, Sparkles, Clock, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/")({
  component: PortalHome,
});

function PortalHome() {
  const { data, isLoading } = useQuery({ queryKey: ["portal-dashboard"], queryFn: () => getPortalDashboard() });
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data) return null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Clinic operator portal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Claim your research site profile, update your details, and surface your recruiting trials to patients across the U.S.
        </p>
      </header>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Hospital className="h-4 w-4" /> Your clinics
        </h2>
        {data.clinics.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm">
            <p>You have not been approved as the operator of any clinic yet.</p>
            <Link to="/portal/claim" className="mt-3 inline-block rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
              Find &amp; claim your clinic →
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.clinics.map((c: any) => (
              <div key={c.id} className="rounded-lg border border-border bg-card p-4">
                <p className="font-medium leading-tight">{c.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{[c.city, c.state].filter(Boolean).join(", ")}</p>
                <p className="mt-2 text-xs">
                  <span className="rounded-md bg-success/10 px-2 py-0.5 text-success">{c.recruiting_count} recruiting</span>{" "}
                  <span className="rounded-md border border-border px-2 py-0.5 capitalize">{c.plan}</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Link to="/portal/clinic/$id" params={{ id: c.id }} className="rounded-md border border-border px-3 py-1.5 hover:bg-accent">Edit profile</Link>
                  <Link to="/clinics/$slug" params={{ slug: c.slug }} className="rounded-md border border-border px-3 py-1.5 hover:bg-accent">View public page</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-4 w-4" /> Your claim requests
        </h2>
        {data.claims.length === 0 ? (
          <p className="text-sm text-muted-foreground">No claim requests yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.claims.map((c: any) => (
              <li key={c.id} className="flex items-center justify-between rounded-md border border-border bg-card p-3">
                <div>
                  <p className="font-medium">{c.clinics?.name ?? c.clinic_id}</p>
                  <p className="text-xs text-muted-foreground">{[c.clinics?.city, c.clinics?.state].filter(Boolean).join(", ")}</p>
                </div>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-1 text-xs text-success"><CheckCircle2 className="h-3 w-3" /> Approved</span>;
  if (status === "rejected") return <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive"><XCircle className="h-3 w-3" /> Rejected</span>;
  return <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> Pending review</span>;
}
