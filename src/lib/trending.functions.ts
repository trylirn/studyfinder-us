import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function pub() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

type Cached = { at: number; data: { slug: string; name: string; study_count: number }[] };
let CACHE: Cached | null = null;
const TTL_MS = 60 * 60 * 1000;

export const getTrendingConditions = createServerFn({ method: "GET" }).handler(async () => {
  if (CACHE && Date.now() - CACHE.at < TTL_MS) return CACHE.data;
  const sb = pub();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [{ data: views }, { data: conditions }] = await Promise.all([
    sb.from("condition_views").select("condition_slug,count").gte("day", since).limit(2000),
    sb
      .from("conditions")
      .select("slug,name,study_count")
      .order("study_count", { ascending: false })
      .limit(60),
  ]);
  const viewMap = new Map<string, number>();
  for (const v of views ?? []) {
    viewMap.set(v.condition_slug, (viewMap.get(v.condition_slug) ?? 0) + (v.count ?? 0));
  }
  const scored = (conditions ?? [])
    .map((c) => ({
      ...c,
      score: c.study_count * 0.6 + (viewMap.get(c.slug) ?? 0) * 1.0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ slug, name, study_count }) => ({ slug, name, study_count }));
  CACHE = { at: Date.now(), data: scored };
  return scored;
});

export const bumpConditionView = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    if (typeof d !== "object" || d === null || !("slug" in d)) throw new Error("invalid");
    const slug = String((d as { slug: unknown }).slug).slice(0, 80);
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("invalid slug");
    return { slug };
  })
  .handler(async ({ data }) => {
    const sb = pub();
    await sb.rpc("bump_condition_view", { _slug: data.slug });
    return { ok: true };
  });
