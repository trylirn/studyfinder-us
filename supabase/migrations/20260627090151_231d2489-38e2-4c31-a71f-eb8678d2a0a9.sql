
-- AI simplification cache
CREATE TABLE public.study_simplifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nct_id text NOT NULL,
  section text NOT NULL,
  model text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nct_id, section)
);
GRANT SELECT ON public.study_simplifications TO anon, authenticated;
GRANT ALL ON public.study_simplifications TO service_role;
ALTER TABLE public.study_simplifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read simplifications" ON public.study_simplifications FOR SELECT TO anon, authenticated USING (true);

-- Trending conditions counter
CREATE TABLE public.condition_views (
  condition_slug text NOT NULL,
  day date NOT NULL DEFAULT current_date,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (condition_slug, day)
);
GRANT SELECT ON public.condition_views TO anon, authenticated;
GRANT ALL ON public.condition_views TO service_role;
ALTER TABLE public.condition_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read views" ON public.condition_views FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.bump_condition_view(_slug text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.condition_views (condition_slug, day, count)
  VALUES (_slug, current_date, 1)
  ON CONFLICT (condition_slug, day) DO UPDATE SET count = public.condition_views.count + 1;
END $$;
GRANT EXECUTE ON FUNCTION public.bump_condition_view(text) TO anon, authenticated;

-- Clinics
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'clinic_admin';

CREATE TABLE public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  specialties text[] NOT NULL DEFAULT '{}',
  address text,
  city text,
  state text,
  zip text,
  lat double precision,
  lng double precision,
  phone text,
  website text,
  hero_image text,
  equipment text[] NOT NULL DEFAULT '{}',
  intake_email text,
  intake_webhook_url text,
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','featured','premium')),
  featured_until timestamptz,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinics_state_idx ON public.clinics (state);
CREATE INDEX clinics_city_idx ON public.clinics (city);
GRANT SELECT ON public.clinics TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.clinics TO authenticated;
GRANT ALL ON public.clinics TO service_role;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published clinics" ON public.clinics FOR SELECT TO anon, authenticated USING (published = true OR public.has_role(auth.uid(), 'admin') OR claimed_by = auth.uid());
CREATE POLICY "clinic admin updates own" ON public.clinics FOR UPDATE TO authenticated USING (claimed_by = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (claimed_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin inserts clinics" ON public.clinics FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin deletes clinics" ON public.clinics FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.clinic_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinic_images_clinic_idx ON public.clinic_images (clinic_id);
GRANT SELECT ON public.clinic_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.clinic_images TO authenticated;
GRANT ALL ON public.clinic_images TO service_role;
ALTER TABLE public.clinic_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read clinic images" ON public.clinic_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "owner manages clinic images" ON public.clinic_images FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = clinic_id AND (c.claimed_by = auth.uid() OR public.has_role(auth.uid(),'admin')))) WITH CHECK (EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = clinic_id AND (c.claimed_by = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- Lead delivery log (NO PHI)
CREATE TABLE public.lead_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL,
  nct_id text NOT NULL,
  channel text NOT NULL,
  status text NOT NULL,
  error text,
  delivered_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lead_delivery_clinic_idx ON public.lead_delivery_log (clinic_id, delivered_at DESC);
GRANT SELECT ON public.lead_delivery_log TO authenticated;
GRANT ALL ON public.lead_delivery_log TO service_role;
ALTER TABLE public.lead_delivery_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic owner reads delivery log" ON public.lead_delivery_log FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = clinic_id AND (c.claimed_by = auth.uid() OR public.has_role(auth.uid(),'admin'))) OR public.has_role(auth.uid(),'admin'));

-- Locations geo columns
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS lng double precision;
