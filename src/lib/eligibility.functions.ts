import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const LeadInput = z.object({
  nctId: z.string().regex(/^NCT\d+$/i),
  age: z.coerce.number().int().min(0).max(120),
  gender: z.enum(["male", "female", "other", "prefer_not"]),
  zip: z.string().regex(/^\d{5}$/),
  confirmedCriteria: z.array(z.string().max(300)).max(20),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(7).max(40),
  consent: z.literal(true),
});

export const submitEligibilityLead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => LeadInput.parse(d))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const sb = createClient<Database>(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const nctId = data.nctId.toUpperCase();

    // 1. Load study + locations to evaluate fit and pick destination
    const [{ data: study }, { data: locations }] = await Promise.all([
      sb
        .from("studies")
        .select("nct_id,title,min_age_years,max_age_years,gender,overall_status,sponsor_name")
        .eq("nct_id", nctId)
        .maybeSingle(),
      sb
        .from("locations")
        .select("facility,city,state,zip")
        .eq("nct_id", nctId),
    ]);

    if (!study) return { ok: false as const, reason: "Trial not found." };

    // 2. Stateless eligibility evaluation
    const reasons: string[] = [];
    if (study.min_age_years != null && data.age < study.min_age_years)
      reasons.push(`This trial requires age ${study.min_age_years} or older.`);
    if (study.max_age_years != null && data.age > study.max_age_years)
      reasons.push(`This trial requires age ${study.max_age_years} or younger.`);
    const g = (study.gender ?? "ALL").toUpperCase();
    if (g !== "ALL" && g !== data.gender.toUpperCase()) {
      reasons.push(`This trial is for ${study.gender ?? "a specific gender"} participants.`);
    }
    if (study.overall_status && study.overall_status !== "RECRUITING") {
      reasons.push("This trial is not currently recruiting.");
    }
    if (reasons.length > 0) {
      return { ok: false as const, reason: reasons.join(" ") };
    }

    // 3. Pick nearest site by ZIP prefix (cheap heuristic — map view will replace)
    const zipPrefix = data.zip.slice(0, 2);
    const site =
      (locations ?? []).find((l) => (l.zip ?? "").startsWith(zipPrefix)) ??
      (locations ?? [])[0] ??
      null;

    // 4. Build packet (NEVER persisted with PHI)
    const packet = {
      trial: { nct_id: nctId, title: study.title, sponsor: study.sponsor_name },
      contact: { name: data.name, email: data.email, phone: data.phone },
      pre_screening: {
        age: data.age,
        gender: data.gender,
        zip: data.zip,
        confirmed_criteria: data.confirmedCriteria,
      },
      preferred_site: site,
      submitted_at: new Date().toISOString(),
    };

    // 5. Attempt delivery via Resend (if configured); otherwise mark queued.
    let channel = "queued";
    let status = "queued";
    let deliveryError: string | null = null;
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const to = "leads@trialfinderus.example"; // placeholder until clinics table is wired
        const body = {
          from: "TrialFinderUS Leads <onboarding@resend.dev>",
          to: [to],
          subject: `New trial lead: ${nctId} — ${study.title}`.slice(0, 180),
          text: JSON.stringify(packet, null, 2),
        };
        const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.LOVABLE_API_KEY ?? ""}`,
            "X-Connection-Api-Key": resendKey,
          },
          body: JSON.stringify(body),
        });
        if (r.ok) {
          channel = "email";
          status = "delivered";
        } else {
          status = "failed";
          deliveryError = `email_${r.status}`;
        }
      } catch (e) {
        status = "failed";
        deliveryError = e instanceof Error ? e.message : "unknown";
      }
    }

    // 6. Log delivery metadata only (no PHI)
    await sb.from("lead_delivery_log").insert({
      nct_id: nctId,
      clinic_id: null,
      channel,
      status,
      error: deliveryError,
    });

    return { ok: true as const, delivered: status === "delivered", channel };
  });
