import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const MODEL = "google/gemini-3-flash-preview";

const SIMPLIFY_PROMPT = `Rewrite the following clinical trial text in plain English at a 5th-grade reading level.
- Use short, simple sentences.
- Replace medical jargon with everyday words; if a medical term must stay, briefly explain it in parentheses.
- Keep all medically important facts (conditions, treatments, eligibility numbers, ages, dosages).
- Do NOT add medical advice, recommendations, or anything not in the original.
- Output plain prose. No headings, no bullet lists.
TEXT:
`;

export const simplifyStudyText = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        nctId: z.string().regex(/^NCT\d+$/i),
        section: z.enum(["summary", "description", "eligibility"]),
        text: z.string().min(20).max(20000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const sb = createClient<Database>(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const nctId = data.nctId.toUpperCase();

    const { data: cached } = await sb
      .from("study_simplifications")
      .select("text,model,created_at")
      .eq("nct_id", nctId)
      .eq("section", data.section)
      .maybeSingle();
    if (cached) return { text: cached.text, cached: true };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const { text } = await generateText({
      model: gateway(MODEL),
      prompt: SIMPLIFY_PROMPT + data.text.slice(0, 8000),
    });

    await sb.from("study_simplifications").upsert(
      { nct_id: nctId, section: data.section, model: MODEL, text },
      { onConflict: "nct_id,section" },
    );
    return { text, cached: false };
  });
