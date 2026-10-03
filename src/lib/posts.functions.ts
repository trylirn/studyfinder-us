import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

const postShape = z.object({
  id: z.string().uuid().optional(),
  source_id: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(300),
  seo_title: z.string().trim().max(300).nullable().optional(),
  slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  meta_description: z.string().trim().max(320).nullable().optional(),
  excerpt: z.string().trim().max(1000).nullable().optional(),
  content_html: z.string().min(1).max(1_000_000),
  content_markdown: z.string().max(1_000_000).nullable().optional(),
  cover_image_prompt: z.string().max(1000).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  citations: z.unknown().optional(),
  author: z.string().trim().max(160).nullable().optional(),
  category: z.string().trim().max(160).nullable().optional(),
  published_at: z.string().datetime({ offset: true }).nullable().optional(),
});

export type Post = z.infer<typeof postShape> & { id: string; created_at: string };

export const listPosts = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await (sb.from("posts" as never) as any)
    .select("id,source_id,title,seo_title,slug,meta_description,excerpt,content_html,content_markdown,cover_image_prompt,tags,citations,author,category,published_at,created_at")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Post[];
});

export const getPost = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().min(1).max(180) }).parse(data))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: post, error } = await (sb.from("posts" as never) as any)
      .select("id,source_id,title,seo_title,slug,meta_description,excerpt,content_html,content_markdown,cover_image_prompt,tags,citations,author,category,published_at,created_at")
      .eq("slug", data.slug)
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (post ?? null) as Post | null;
  });

export { postShape };