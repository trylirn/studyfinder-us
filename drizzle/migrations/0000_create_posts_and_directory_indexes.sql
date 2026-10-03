CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL UNIQUE,
  title text NOT NULL,
  seo_title text,
  slug text NOT NULL UNIQUE,
  meta_description text,
  excerpt text,
  content_html text NOT NULL,
  content_markdown text,
  cover_image_prompt text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  author text,
  category text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.posts TO anon, authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published posts" ON public.posts
  FOR SELECT TO anon, authenticated
  USING (published_at IS NOT NULL AND published_at <= now());
CREATE INDEX posts_published_at_idx ON public.posts (published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX idx_clinics_published_recruiting ON public.clinics (recruiting_count DESC, name ASC) WHERE published = true;
CREATE INDEX idx_studies_recruiting_recent ON public.studies (last_update_posted DESC NULLS LAST, nct_id DESC) WHERE overall_status = 'RECRUITING' AND brief_summary IS NOT NULL;