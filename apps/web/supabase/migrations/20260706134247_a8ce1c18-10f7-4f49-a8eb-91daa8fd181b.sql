
-- Roles enum + user_roles table
CREATE TYPE public.app_role AS ENUM ('ciso', 'md', 'analyst');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  department TEXT,
  trust_score INT NOT NULL DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles readable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles self assign on signup" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Agents inventory
CREATE TABLE public.agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  department TEXT NOT NULL,
  tier INT NOT NULL CHECK (tier IN (1,2,3)),
  source TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('governed','monitoring','unmanaged')),
  discovered_at DATE NOT NULL,
  calls_per_day TEXT NOT NULL,
  reg_tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agents TO authenticated;
GRANT ALL ON public.agents TO service_role;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents readable by authenticated" ON public.agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "agents managed by ciso" ON public.agents FOR ALL TO authenticated USING (public.has_role(auth.uid(),'ciso')) WITH CHECK (public.has_role(auth.uid(),'ciso'));

-- Discovery stats
CREATE TABLE public.discovery_stats (
  source TEXT PRIMARY KEY,
  found INT NOT NULL,
  new_7d INT NOT NULL,
  covered INT NOT NULL,
  description TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.discovery_stats TO authenticated;
GRANT ALL ON public.discovery_stats TO service_role;
ALTER TABLE public.discovery_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "discovery readable by authenticated" ON public.discovery_stats FOR SELECT TO authenticated USING (true);

-- Guardrail events
CREATE TABLE public.guardrail_events (
  id TEXT PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  agent_id TEXT REFERENCES public.agents(id) ON DELETE SET NULL,
  agent_name TEXT NOT NULL,
  tier INT NOT NULL CHECK (tier IN (1,2,3)),
  user_label TEXT NOT NULL,
  user_trust INT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('hard_block','soft_flag','silent_log')),
  category TEXT NOT NULL,
  rule TEXT NOT NULL,
  reg_ref TEXT NOT NULL,
  prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.guardrail_events TO authenticated;
GRANT ALL ON public.guardrail_events TO service_role;
ALTER TABLE public.guardrail_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events readable by authenticated" ON public.guardrail_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events insert by ciso" ON public.guardrail_events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'ciso'));

-- Override events
CREATE TABLE public.override_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES public.guardrail_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_display_name TEXT NOT NULL,
  user_role public.app_role NOT NULL,
  justification TEXT NOT NULL CHECK (char_length(justification) >= 8),
  evidence_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.override_events TO authenticated;
GRANT ALL ON public.override_events TO service_role;
ALTER TABLE public.override_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "overrides readable by authenticated" ON public.override_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "overrides insert by md or ciso" ON public.override_events FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND (public.has_role(auth.uid(),'md') OR public.has_role(auth.uid(),'ciso'))
);

-- Immutable audit vault (append-only)
CREATE TABLE public.audit_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash TEXT NOT NULL,
  kind TEXT NOT NULL,
  ref TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_display_name TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_vault TO authenticated;
GRANT ALL ON public.audit_vault TO service_role;
ALTER TABLE public.audit_vault ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vault readable by authenticated" ON public.audit_vault FOR SELECT TO authenticated USING (true);
CREATE POLICY "vault insert by authenticated" ON public.audit_vault FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);

CREATE OR REPLACE FUNCTION public.block_vault_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_vault is append-only';
END;
$$;
CREATE TRIGGER audit_vault_no_update BEFORE UPDATE ON public.audit_vault FOR EACH ROW EXECUTE FUNCTION public.block_vault_mutation();
CREATE TRIGGER audit_vault_no_delete BEFORE DELETE ON public.audit_vault FOR EACH ROW EXECUTE FUNCTION public.block_vault_mutation();

-- Mock SEC exam runs
CREATE TABLE public.mock_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_by_name TEXT NOT NULL,
  hours NUMERIC(5,2) NOT NULL,
  score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
  agent_count INT NOT NULL,
  event_count INT NOT NULL,
  override_count INT NOT NULL,
  pack_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.mock_exams TO authenticated;
GRANT ALL ON public.mock_exams TO service_role;
ALTER TABLE public.mock_exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exams readable by authenticated" ON public.mock_exams FOR SELECT TO authenticated USING (true);
CREATE POLICY "exams insert by ciso" ON public.mock_exams FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = run_by AND public.has_role(auth.uid(),'ciso')
);

-- Auto-profile trigger on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  requested_role public.app_role;
  trust INT;
BEGIN
  requested_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'analyst');
  trust := CASE requested_role
    WHEN 'ciso' THEN 95
    WHEN 'md' THEN 85
    ELSE 50
  END;

  INSERT INTO public.profiles (id, display_name, department, trust_score)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'department',
    trust
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, requested_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
