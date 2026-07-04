import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Allow only http(s) URLs — blocks javascript:, data:, etc. to prevent stored XSS
// when the value is later rendered as an <a href={...}> link.
const httpUrl = z
  .string()
  .max(500)
  .refine(
    (v) => {
      if (!v) return true;
      try {
        const u = new URL(v);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL must start with http:// or https://" },
  );


async function isAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data);
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  if (!(await isAdmin(context))) throw new Error("Forbidden: admin only");
}

export const getPortalDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const admin = await isAdmin(context);
    const [{ data: myClaims }, { data: ownedClinics }] = await Promise.all([
      supabase
        .from("clinic_claims")
        .select("id,clinic_id,status,note,created_at,clinics(slug,name,city,state)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("clinics")
        .select("id,slug,name,city,state,plan,featured_until,recruiting_count,claim_status,hero_image")
        .eq("claimed_by", userId)
        .order("name"),
    ]);
    return {
      isAdmin: admin,
      claims: myClaims ?? [],
      clinics: ownedClinics ?? [],
    };
  });

export const submitClinicClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        clinicId: z.string().uuid(),
        contactName: z.string().min(2).max(120),
        contactEmail: z.string().email(),
        contactPhone: z.string().max(40).optional().default(""),
        role: z.string().max(120).optional().default(""),
        relationship: z.string().max(80).optional().default(""),
        npi: z.string().max(40).optional().default(""),
        workWebsite: httpUrl.optional().default(""),
        note: z.string().max(2000).optional().default(""),
        proofPaths: z.array(z.string().max(500)).max(5).optional().default([]),
        attested: z.boolean().optional().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!data.attested) throw new Error("You must confirm the attestation.");
    const { error } = await context.supabase.from("clinic_claims").insert({
      user_id: context.userId,
      clinic_id: data.clinicId,
      status: "pending",
      contact_name: data.contactName,
      contact_email: data.contactEmail,
      contact_phone: data.contactPhone,
      role: data.role,
      relationship: data.relationship,
      npi: data.npi,
      work_website: data.workWebsite,
      note: data.note,
      proof_paths: data.proofPaths,
      attested: data.attested,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateMyClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        clinicId: z.string().uuid(),
        patch: z.object({
          phone: z.string().max(40).optional(),
          website: z.string().url().max(500).optional().or(z.literal("")),
          intake_email: z.string().email().optional().or(z.literal("")),
          description: z.string().max(4000).optional(),
          specialties: z.array(z.string().max(80)).max(40).optional(),
          hero_image: z.string().max(2000).optional(),
        }),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // Verify ownership
    const { data: clinic } = await context.supabase
      .from("clinics").select("claimed_by").eq("id", data.clinicId).maybeSingle();
    const admin = await isAdmin(context);
    if (!admin && (!clinic || clinic.claimed_by !== context.userId)) {
      throw new Error("Forbidden: not your clinic");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("clinics").update(data.patch).eq("id", data.clinicId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listPendingClaims = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("clinic_claims")
      .select("id,user_id,clinic_id,status,note,contact_name,contact_email,contact_phone,role,relationship,npi,work_website,proof_paths,attested,created_at,clinics(slug,name,city,state)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getClaimProofUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ paths: z.array(z.string().max(500)).max(10) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.paths.length === 0) return [] as { path: string; url: string | null }[];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("clinic-images")
      .createSignedUrls(data.paths, 300);
    if (error) throw new Error(error.message);
    return (signed ?? []).map((s: any) => ({ path: s.path, url: s.signedUrl ?? null }));
  });

export const decideClinicClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ claimId: z.string().uuid(), decision: z.enum(["approved", "rejected"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: claim, error: cErr } = await supabaseAdmin
      .from("clinic_claims").select("id,user_id,clinic_id").eq("id", data.claimId).maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!claim) throw new Error("Claim not found");
    await supabaseAdmin.from("clinic_claims").update({ status: data.decision }).eq("id", data.claimId);
    if (data.decision === "approved") {
      await supabaseAdmin.from("clinics").update({
        claim_status: "claimed", claimed_by: claim.user_id,
      }).eq("id", claim.clinic_id);
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: claim.user_id, role: "clinic_admin" },
        { onConflict: "user_id,role" },
      );
    }
    return { ok: true };
  });

export const getMyClinicForEdit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context);
    // Verify ownership using the RLS-scoped client BEFORE loading sensitive fields
    const { data: ownerRow, error: ownerErr } = await context.supabase
      .from("clinics").select("id,claimed_by").eq("id", data.id).maybeSingle();
    if (ownerErr) throw new Error(ownerErr.message);
    if (!ownerRow) return null;
    if (!admin && ownerRow.claimed_by !== context.userId) throw new Error("Forbidden");
    // Load full row (including intake_email/intake_webhook_url) via admin client,
    // since anon/authenticated roles are not granted SELECT on those columns.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: clinic, error } = await supabaseAdmin
      .from("clinics").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return clinic;
  });
