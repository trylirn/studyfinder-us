import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listClinics } from "@/lib/directory.functions";
import { submitClinicClaim } from "@/lib/clinics.functions";

export const Route = createFileRoute("/_authenticated/portal/claim")({
  component: ClaimPage,
});

function ClaimPage() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ contactName: "", contactEmail: "", contactPhone: "", note: "" });
  const [done, setDone] = useState(false);
  const qc = useQueryClient();

  const { data: clinics } = useQuery({
    queryKey: ["clinics-search", q],
    queryFn: () => listClinics({ data: { q, page: 1 } }),
    enabled: q.length >= 2,
  });

  const claim = useMutation({
    mutationFn: () =>
      submitClinicClaim({ data: { clinicId: selected.id ?? selected.slug, ...form } } as any),
    onSuccess: () => {
      setDone(true);
      qc.invalidateQueries({ queryKey: ["portal-dashboard"] });
    },
  });

  if (done) {
    return (
      <div className="rounded-lg border border-success/40 bg-success/5 p-6">
        <h2 className="text-lg font-semibold">Claim submitted</h2>
        <p className="mt-2 text-sm">
          Our team reviews claims within 1–2 business days. Once approved, you will be granted edit access to <strong>{selected.name}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Claim your clinic</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search for your research site, submit your verification details, and our team will review the request.
        </p>
      </header>

      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground">Search clinics</label>
        <input
          autoFocus
          value={q}
          onChange={(e) => { setQ(e.target.value); setSelected(null); }}
          placeholder="e.g. Mayo Clinic, Mount Sinai…"
          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>

      {q.length >= 2 && !selected && (
        <ul className="max-h-72 divide-y divide-border overflow-auto rounded-md border border-border bg-card">
          {(clinics?.rows ?? []).map((c: any) => (
            <li key={c.slug}>
              <button
                type="button"
                onClick={() => setSelected(c)}
                className="block w-full px-4 py-2 text-left text-sm hover:bg-accent"
              >
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{[c.city, c.state].filter(Boolean).join(", ")}</p>
              </button>
            </li>
          ))}
          {(clinics?.rows ?? []).length === 0 && <li className="p-3 text-sm text-muted-foreground">No clinics match.</li>}
        </ul>
      )}

      {selected && (
        <div className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Selected clinic</p>
              <p className="mt-1 font-medium">{selected.name}</p>
              <p className="text-xs text-muted-foreground">{[selected.city, selected.state].filter(Boolean).join(", ")}</p>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); claim.mutate(); }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <Field label="Your full name" required value={form.contactName} onChange={(v) => setForm({ ...form, contactName: v })} />
            <Field label="Work email" required type="email" value={form.contactEmail} onChange={(v) => setForm({ ...form, contactEmail: v })} />
            <Field label="Phone (optional)" value={form.contactPhone} onChange={(v) => setForm({ ...form, contactPhone: v })} />
            <div className="sm:col-span-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Verification note</label>
              <textarea
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Your role, department, NPI, or any details that help us verify your affiliation."
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            {claim.error && <p className="sm:col-span-2 text-sm text-destructive">{(claim.error as Error).message}</p>}
            <button
              disabled={claim.isPending}
              className="sm:col-span-2 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {claim.isPending ? "Submitting…" : "Submit claim for review"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
    </div>
  );
}
