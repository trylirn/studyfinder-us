import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getMyClinicForEdit, updateMyClinic } from "@/lib/clinics.functions";

export const Route = createFileRoute("/_authenticated/portal/clinic/$id")({
  component: EditClinic,
});

function EditClinic() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: clinic, isLoading } = useQuery({
    queryKey: ["my-clinic", id],
    queryFn: () => getMyClinicForEdit({ data: { id } }),
  });
  const [form, setForm] = useState({
    phone: "", website: "", intake_email: "", description: "", specialties: "", hero_image: "",
  });
  useEffect(() => {
    if (clinic) {
      setForm({
        phone: clinic.phone ?? "",
        website: clinic.website ?? "",
        intake_email: clinic.intake_email ?? "",
        description: clinic.description ?? "",
        specialties: (clinic.specialties ?? []).join(", "),
        hero_image: clinic.hero_image ?? "",
      });
    }
  }, [clinic]);
  const save = useMutation({
    mutationFn: () =>
      updateMyClinic({
        data: {
          clinicId: id,
          patch: {
            phone: form.phone,
            website: form.website,
            intake_email: form.intake_email,
            description: form.description,
            specialties: form.specialties.split(",").map((s) => s.trim()).filter(Boolean),
            hero_image: form.hero_image,
          },
        },
      } as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-clinic", id] }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!clinic) return <p className="text-sm">Not found.</p>;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{clinic.name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{[clinic.city, clinic.state].filter(Boolean).join(", ")}</p>
        </div>
        <Link to="/clinics/$slug" params={{ slug: clinic.slug }} className="text-sm text-primary hover:underline">View public →</Link>
      </header>

      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Website" type="url" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
        <Field label="Intake email (where eligibility leads go)" type="email" value={form.intake_email} onChange={(v) => setForm({ ...form, intake_email: v })} />
        <Field label="Hero image URL" value={form.hero_image} onChange={(v) => setForm({ ...form, hero_image: v })} />
        <div className="sm:col-span-2">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Specialties (comma-separated)</label>
          <input
            value={form.specialties}
            onChange={(e) => setForm({ ...form, specialties: e.target.value })}
            placeholder="Oncology, Cardiology, Endocrinology"
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Description</label>
          <textarea
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        {save.error && <p className="sm:col-span-2 text-sm text-destructive">{(save.error as Error).message}</p>}
        {save.isSuccess && <p className="sm:col-span-2 text-sm text-success">Saved.</p>}
        <button
          disabled={save.isPending}
          className="sm:col-span-2 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
    </div>
  );
}
