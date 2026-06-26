
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- States (50 US states + DC)
CREATE TABLE public.states (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  abbr TEXT NOT NULL UNIQUE,
  study_count INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.states TO anon, authenticated;
GRANT ALL ON public.states TO service_role;
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read states" ON public.states FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write states" ON public.states FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.states (slug, name, abbr) VALUES
('alabama','Alabama','AL'),('alaska','Alaska','AK'),('arizona','Arizona','AZ'),('arkansas','Arkansas','AR'),
('california','California','CA'),('colorado','Colorado','CO'),('connecticut','Connecticut','CT'),('delaware','Delaware','DE'),
('district-of-columbia','District of Columbia','DC'),('florida','Florida','FL'),('georgia','Georgia','GA'),('hawaii','Hawaii','HI'),
('idaho','Idaho','ID'),('illinois','Illinois','IL'),('indiana','Indiana','IN'),('iowa','Iowa','IA'),
('kansas','Kansas','KS'),('kentucky','Kentucky','KY'),('louisiana','Louisiana','LA'),('maine','Maine','ME'),
('maryland','Maryland','MD'),('massachusetts','Massachusetts','MA'),('michigan','Michigan','MI'),('minnesota','Minnesota','MN'),
('mississippi','Mississippi','MS'),('missouri','Missouri','MO'),('montana','Montana','MT'),('nebraska','Nebraska','NE'),
('nevada','Nevada','NV'),('new-hampshire','New Hampshire','NH'),('new-jersey','New Jersey','NJ'),('new-mexico','New Mexico','NM'),
('new-york','New York','NY'),('north-carolina','North Carolina','NC'),('north-dakota','North Dakota','ND'),('ohio','Ohio','OH'),
('oklahoma','Oklahoma','OK'),('oregon','Oregon','OR'),('pennsylvania','Pennsylvania','PA'),('rhode-island','Rhode Island','RI'),
('south-carolina','South Carolina','SC'),('south-dakota','South Dakota','SD'),('tennessee','Tennessee','TN'),('texas','Texas','TX'),
('utah','Utah','UT'),('vermont','Vermont','VT'),('virginia','Virginia','VA'),('washington','Washington','WA'),
('west-virginia','West Virginia','WV'),('wisconsin','Wisconsin','WI'),('wyoming','Wyoming','WY');

-- Cities
CREATE TABLE public.cities (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state_slug TEXT NOT NULL REFERENCES public.states(slug) ON DELETE CASCADE,
  study_count INT NOT NULL DEFAULT 0
);
CREATE INDEX cities_state_idx ON public.cities(state_slug);
CREATE INDEX cities_count_idx ON public.cities(study_count DESC);
GRANT SELECT ON public.cities TO anon, authenticated;
GRANT ALL ON public.cities TO service_role;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read cities" ON public.cities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write cities" ON public.cities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Conditions
CREATE TABLE public.conditions (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  study_count INT NOT NULL DEFAULT 0,
  overview TEXT
);
CREATE INDEX conditions_count_idx ON public.conditions(study_count DESC);
GRANT SELECT ON public.conditions TO anon, authenticated;
GRANT ALL ON public.conditions TO service_role;
ALTER TABLE public.conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read conditions" ON public.conditions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write conditions" ON public.conditions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Sponsors
CREATE TABLE public.sponsors (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  study_count INT NOT NULL DEFAULT 0
);
CREATE INDEX sponsors_count_idx ON public.sponsors(study_count DESC);
GRANT SELECT ON public.sponsors TO anon, authenticated;
GRANT ALL ON public.sponsors TO service_role;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read sponsors" ON public.sponsors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write sponsors" ON public.sponsors FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Studies
CREATE TABLE public.studies (
  nct_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  brief_summary TEXT,
  detailed_description TEXT,
  phase TEXT,
  overall_status TEXT,
  study_type TEXT,
  conditions TEXT[] NOT NULL DEFAULT '{}',
  condition_slugs TEXT[] NOT NULL DEFAULT '{}',
  interventions JSONB NOT NULL DEFAULT '[]'::jsonb,
  eligibility JSONB NOT NULL DEFAULT '{}'::jsonb,
  min_age_years NUMERIC,
  max_age_years NUMERIC,
  gender TEXT,
  sponsor_name TEXT,
  sponsor_slug TEXT,
  collaborators TEXT[] NOT NULL DEFAULT '{}',
  start_date DATE,
  completion_date DATE,
  last_update_posted DATE,
  enrollment INT,
  state_slugs TEXT[] NOT NULL DEFAULT '{}',
  city_slugs TEXT[] NOT NULL DEFAULT '{}',
  search_tsv tsvector,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX studies_status_idx ON public.studies(overall_status);
CREATE INDEX studies_phase_idx ON public.studies(phase);
CREATE INDEX studies_sponsor_idx ON public.studies(sponsor_slug);
CREATE INDEX studies_conditions_idx ON public.studies USING GIN(condition_slugs);
CREATE INDEX studies_states_idx ON public.studies USING GIN(state_slugs);
CREATE INDEX studies_cities_idx ON public.studies USING GIN(city_slugs);
CREATE INDEX studies_tsv_idx ON public.studies USING GIN(search_tsv);
CREATE INDEX studies_updated_idx ON public.studies(last_update_posted DESC);
GRANT SELECT ON public.studies TO anon, authenticated;
GRANT ALL ON public.studies TO service_role;
ALTER TABLE public.studies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read studies" ON public.studies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write studies" ON public.studies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.studies_tsv_trigger() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_tsv := to_tsvector('english', coalesce(NEW.title,'') || ' ' || coalesce(NEW.brief_summary,'') || ' ' || coalesce(array_to_string(NEW.conditions,' '),'') || ' ' || coalesce(NEW.sponsor_name,''));
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER studies_tsv_update BEFORE INSERT OR UPDATE ON public.studies FOR EACH ROW EXECUTE FUNCTION public.studies_tsv_trigger();

-- Locations
CREATE TABLE public.locations (
  id BIGSERIAL PRIMARY KEY,
  nct_id TEXT NOT NULL REFERENCES public.studies(nct_id) ON DELETE CASCADE,
  facility TEXT,
  city TEXT,
  city_slug TEXT,
  state TEXT,
  state_slug TEXT,
  country TEXT,
  zip TEXT,
  status TEXT
);
CREATE INDEX locations_nct_idx ON public.locations(nct_id);
CREATE INDEX locations_state_idx ON public.locations(state_slug);
CREATE INDEX locations_city_idx ON public.locations(city_slug);
GRANT SELECT ON public.locations TO anon, authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read locations" ON public.locations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write locations" ON public.locations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Import runs
CREATE TABLE public.import_runs (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  inserted INT NOT NULL DEFAULT 0,
  updated INT NOT NULL DEFAULT 0,
  pages INT NOT NULL DEFAULT 0,
  error TEXT,
  params JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT ON public.import_runs TO authenticated;
GRANT ALL ON public.import_runs TO service_role;
ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read import_runs" ON public.import_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin write import_runs" ON public.import_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
