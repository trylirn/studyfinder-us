import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function isAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
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
        note: z.string().max(2000).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("clinic_claims").insert({
      user_id: context.userId,
      clinic_id: data.clinicId,
      status: "pending",
      contact_name: data.contactName,
      contact_email: data.contactEmail,
      contact_phone: data.contactPhone,
      note: data.note,
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
      .select("id,user_id,clinic_id,status,note,contact_name,contact_email,contact_phone,created_at,clinics(slug,name,city,state)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
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
    const { data: clinic, error } = await context.supabase
      .from("clinics").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!clinic) return null;
    if (!admin && clinic.claimed_by !== context.userId) throw new Error("Forbidden");
    return clinic;
  });
