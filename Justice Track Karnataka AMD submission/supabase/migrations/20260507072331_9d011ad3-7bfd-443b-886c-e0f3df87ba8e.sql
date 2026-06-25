
-- Enums
CREATE TYPE public.app_role AS ENUM ('super_admin','legal_officer','reviewing_officer','department_admin','viewer');
CREATE TYPE public.case_status AS ENUM ('uploaded','extracting','pending','in_review','verified','rejected');
CREATE TYPE public.priority_level AS ENUM ('high','medium','low');
CREATE TYPE public.field_decision AS ENUM ('pending','approved','edited','rejected');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  designation TEXT,
  department TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.current_user_has_any_role(_roles public.app_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ANY(_roles)) $$;

-- Auto-create profile + default viewer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Departments
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

INSERT INTO public.departments (name, code) VALUES
  ('Revenue Department','REV'),
  ('Urban Development','UD'),
  ('Home Department','HOME'),
  ('Education Department','EDU'),
  ('Health & Family Welfare','HFW'),
  ('Forest, Ecology & Environment','FEE'),
  ('Public Works Department','PWD'),
  ('Department of Personnel & Administrative Reforms','DPAR');

-- Cases
CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT,
  title TEXT,
  court TEXT,
  judge TEXT,
  order_date DATE,
  petitioner TEXT,
  respondent TEXT,
  department TEXT,
  status public.case_status NOT NULL DEFAULT 'uploaded',
  priority public.priority_level NOT NULL DEFAULT 'medium',
  appeal_deadline_days INTEGER,
  pdf_path TEXT,
  pdf_name TEXT,
  pdf_pages INTEGER,
  extracted_text TEXT,
  extraction_summary TEXT,
  extraction_confidence NUMERIC(4,3),
  uploaded_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.extracted_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT,
  confidence NUMERIC(4,3),
  source_page INTEGER,
  source_quote TEXT,
  decision public.field_decision NOT NULL DEFAULT 'pending',
  edited_value TEXT,
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.extracted_fields ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.directives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  department TEXT,
  deadline DATE,
  priority public.priority_level NOT NULL DEFAULT 'medium',
  source_page INTEGER,
  source_quote TEXT,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.directives ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES auth.users(id),
  actor_name TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  details JSONB,
  prev_hash TEXT,
  hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- updated_at trigger for cases
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER cases_touch_updated_at BEFORE UPDATE ON public.cases
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS POLICIES
-- profiles
CREATE POLICY "profiles self select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "roles self read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "roles admin write" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- departments: read all authenticated, write super admin
CREATE POLICY "dept read" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "dept admin" ON public.departments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- cases: any authenticated officer reads; legal/reviewing/super_admin can write
CREATE POLICY "cases read" ON public.cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "cases insert" ON public.cases FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_any_role(ARRAY['legal_officer','reviewing_officer','super_admin','department_admin']::public.app_role[]));
CREATE POLICY "cases update" ON public.cases FOR UPDATE TO authenticated
  USING (public.current_user_has_any_role(ARRAY['legal_officer','reviewing_officer','super_admin','department_admin']::public.app_role[]));

-- fields
CREATE POLICY "fields read" ON public.extracted_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "fields write" ON public.extracted_fields FOR ALL TO authenticated
  USING (public.current_user_has_any_role(ARRAY['legal_officer','reviewing_officer','super_admin']::public.app_role[]))
  WITH CHECK (public.current_user_has_any_role(ARRAY['legal_officer','reviewing_officer','super_admin']::public.app_role[]));

-- directives
CREATE POLICY "dir read" ON public.directives FOR SELECT TO authenticated USING (true);
CREATE POLICY "dir write" ON public.directives FOR ALL TO authenticated
  USING (public.current_user_has_any_role(ARRAY['legal_officer','reviewing_officer','super_admin','department_admin']::public.app_role[]))
  WITH CHECK (public.current_user_has_any_role(ARRAY['legal_officer','reviewing_officer','super_admin','department_admin']::public.app_role[]));

-- audit logs: all authenticated read; insert by anyone authenticated (logged via server)
CREATE POLICY "audit read" ON public.audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);

-- notifications
CREATE POLICY "notif read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('judgments','judgments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "judgments authenticated read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'judgments');
CREATE POLICY "judgments authenticated upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'judgments');
CREATE POLICY "judgments authenticated delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'judgments' AND owner = auth.uid());
