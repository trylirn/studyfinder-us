import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { listClinics } from "@/lib/directory.functions";
import { submitClinicClaim } from "@/lib/clinics.functions";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, ShieldCheck } from "lucide-react";

const searchSchema = z.object({ clinic: z.string().optional() });

export const Route = createFileRoute("/_authenticated/portal/claim")({
  validateSearch: searchSchema,
  component: ClaimPage,
});

const RELATIONSHIPS = [
  "Owner",
  "Administrator",
  "Principal Investigator",
  "Study Coordinator",
  "Clinical Staff",
  "Marketing / Communications",
  "Other",
];

function ClaimPage() {
  const { clinic: preselectSlug } = Route.useSearch();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    role: "",
    relationship: RELATIONSHIPS[0],
    npi: "",
    workWebsite: "",
    note: "",
  });
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [attested, setAttested] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const qc = useQueryClient();

  const { data: clinics } = useQuery({
    queryKey: ["clinics-search", q],
    queryFn: () => listClinics({ data: { q, page: 1 } }),
    enabled: q.length >= 2,
  });

  // Preselect from ?clinic=<slug>
  const { data: preselect } = useQuery({
    queryKey: ["clinic-preselect", preselectSlug ?? ""],
    queryFn: () => listClinics({ data: { q: preselectSlug ?? "", page: 1 } }),
    enabled: !!preselectSlug && !selected,
  });
  useEffect(() => {
    if (preselectSlug && !selected && preselect?.rows) {
      const found = preselect.rows.find((c: any) => c.slug === preselectSlug);
      if (found) setSelected(found);
    }
  }, [preselectSlug, preselect, selected]);

  const claim = useMutation({
    mutationFn: async () => {
      setUploadErr(null);
      // Upload proof files first
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");
      const paths: string[] = [];
      for (const file of proofFiles) {
        if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} is over 8MB`);
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `claims/${userId}/${crypto.randomUUID()}-${safe}`;
        const { error } = await supabase.storage.from("clinic-images").upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
        if (error) throw new Error(`Upload failed: ${error.message}`);
        paths.push(path);
      }
      return submitClinicClaim({
        data: {
          clinicId: selected.id ?? selected.slug,
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          role: form.role,
          relationship: form.relationship,
          npi: form.npi,
          workWebsite: form.workWebsite,
          note: form.note,
          proofPaths: paths,
          attested,
        },
      } as any);
    },
    onSuccess: () => {
      setDone(true);
      qc.invalidateQueries({ queryKey: ["portal-dashboard"] });
    },
    onError: (err) => setUploadErr((err as Error).message),
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
          Search for your research site, submit your verification details and proof of affiliation, and our team will review the request.
        </p>
      </header>

      {!selected && (
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Search clinics</label>
          <input
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); }}
            placeholder="e.g. Mayo Clinic, Mount Sinai…"
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          {q.length >= 2 && (
            <ul className="mt-2 max-h-72 divide-y divide-border overflow-auto rounded-md border border-border bg-card">
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
        </div>
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
            onSubmit={(e) => { e.preventDefault(); if (!attested) { setUploadErr("Please confirm the attestation below."); return; } claim.mutate(); }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <Field label="Your full name" required value={form.contactName} onChange={(v) => setForm({ ...form, contactName: v })} />
            <Field label="Work email" required type="email" value={form.contactEmail} onChange={(v) => setForm({ ...form, contactEmail: v })} />
            <Field label="Phone (optional)" value={form.contactPhone} onChange={(v) => setForm({ ...form, contactPhone: v })} />
            <Field label="Job title / role" required value={form.role} onChange={(v) => setForm({ ...form, role: v })} />
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Relationship to clinic</label>
              <select
                required
                value={form.relationship}
                onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <Field label="NPI (optional)" value={form.npi} onChange={(v) => setForm({ ...form, npi: v })} />
            <div className="sm:col-span-2">
              <Field label="Work website (optional)" type="url" value={form.workWebsite} onChange={(v) => setForm({ ...form, workWebsite: v })} />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Proof of affiliation (up to 3 files, max 8MB each)
              </label>
              <p className="mb-2 text-xs text-muted-foreground">
                Accepted: staff badge, business card, letterhead, employment verification, or a screenshot of your work email.
              </p>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-3 text-sm hover:border-primary">
                <Upload className="h-4 w-4 text-primary" />
                <span>{proofFiles.length ? `${proofFiles.length} file(s) selected` : "Choose files"}</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const list = Array.from(e.target.files ?? []).slice(0, 3);
                    setProofFiles(list);
                  }}
                />
              </label>
              {proofFiles.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs">
                  {proofFiles.map((f, i) => (
                    <li key={i} className="flex items-center justify-between rounded border border-border bg-background px-2 py-1">
                      <span className="truncate">{f.name} <span className="text-muted-foreground">({Math.round(f.size / 1024)} KB)</span></span>
                      <button type="button" onClick={() => setProofFiles(proofFiles.filter((_, j) => j !== i))}>
                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Additional notes</label>
              <textarea
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Anything else that helps us verify your affiliation."
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <label className="sm:col-span-2 flex items-start gap-2 rounded-md border border-border bg-background p-3 text-sm">
              <input
                type="checkbox"
                checked={attested}
                onChange={(e) => setAttested(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                <span>
                  I confirm I am authorized to manage <strong>{selected.name}</strong>'s profile on TrialFinderUS, and that the information and documents I've provided are accurate. I understand submitting false claims may result in permanent removal.
                </span>
              </span>
            </label>

            {(uploadErr || claim.error) && (
              <p className="sm:col-span-2 text-sm text-destructive">{uploadErr ?? (claim.error as Error)?.message}</p>
            )}
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
