import { timingSafeEqual } from "crypto";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const postSchema = z.object({
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

function matchesSecret(presented: string, expected: string) {
  const left = new TextEncoder().encode(presented);
  const right = new TextEncoder().encode(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

export const Route = createFileRoute("/api/public/posts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.BLOG_PUBLISH_KEY;
        const authorization = request.headers.get("authorization") ?? "";
        const presented = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
        if (!expected || !presented || !matchesSecret(presented, expected)) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = postSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json({ ok: false, error: "Invalid post payload", details: parsed.error.flatten() }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const post = parsed.data;
        const { error } = await (supabaseAdmin.from("posts" as never) as any)
          .upsert(
            {
              ...post,
              tags: post.tags ?? [],
              citations: post.citations ?? [],
              published_at: post.published_at ?? null,
            },
            { onConflict: "source_id" },
          );
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        return Response.json({ ok: true, url: `https://studyfinder-us.lovable.app/blog/${post.slug}` });
      },
    },
  },
});