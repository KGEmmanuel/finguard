
-- Tighten SELECT policies on all sensitive tables

-- agents: readable by ciso, md, analyst (all GRC roles) — no longer any authenticated
DROP POLICY IF EXISTS "agents readable by authenticated" ON public.agents;
CREATE POLICY "agents readable by grc roles" ON public.agents
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'ciso'::public.app_role)
    OR public.has_role(auth.uid(), 'md'::public.app_role)
    OR public.has_role(auth.uid(), 'analyst'::public.app_role)
  );

-- audit_vault: highly sensitive — only ciso
DROP POLICY IF EXISTS "vault readable by authenticated" ON public.audit_vault;
CREATE POLICY "vault readable by ciso" ON public.audit_vault
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ciso'::public.app_role));

-- discovery_stats: aggregate, restrict to grc roles
DROP POLICY IF EXISTS "discovery readable by authenticated" ON public.discovery_stats;
CREATE POLICY "discovery readable by grc roles" ON public.discovery_stats
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'ciso'::public.app_role)
    OR public.has_role(auth.uid(), 'md'::public.app_role)
    OR public.has_role(auth.uid(), 'analyst'::public.app_role)
  );

-- guardrail_events: prompts + violations — ciso/md only
DROP POLICY IF EXISTS "events readable by authenticated" ON public.guardrail_events;
CREATE POLICY "events readable by security roles" ON public.guardrail_events
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'ciso'::public.app_role)
    OR public.has_role(auth.uid(), 'md'::public.app_role)
  );

-- mock_exam_downloads: downloader or ciso
DROP POLICY IF EXISTS "downloads readable by authenticated" ON public.mock_exam_downloads;
CREATE POLICY "downloads readable by owner or ciso" ON public.mock_exam_downloads
  FOR SELECT TO authenticated
  USING (
    auth.uid() = downloaded_by
    OR public.has_role(auth.uid(), 'ciso'::public.app_role)
  );

-- mock_exams: run_by owner or ciso/md
DROP POLICY IF EXISTS "exams readable by authenticated" ON public.mock_exams;
CREATE POLICY "exams readable by owner or leadership" ON public.mock_exams
  FOR SELECT TO authenticated
  USING (
    auth.uid() = run_by
    OR public.has_role(auth.uid(), 'ciso'::public.app_role)
    OR public.has_role(auth.uid(), 'md'::public.app_role)
  );

-- override_events: acting user or ciso/md
DROP POLICY IF EXISTS "overrides readable by authenticated" ON public.override_events;
CREATE POLICY "overrides readable by owner or leadership" ON public.override_events
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'ciso'::public.app_role)
    OR public.has_role(auth.uid(), 'md'::public.app_role)
  );

-- profiles: self + ciso (for admin views)
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;
CREATE POLICY "profiles readable self or ciso" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'ciso'::public.app_role)
  );

-- user_roles: self + ciso
DROP POLICY IF EXISTS "user_roles readable by authenticated" ON public.user_roles;
CREATE POLICY "user_roles readable self or ciso" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'ciso'::public.app_role)
  );

-- SECURITY DEFINER hardening: trigger-only functions must not be callable by app roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.block_vault_mutation() FROM PUBLIC, anon, authenticated;
-- has_role must remain executable by authenticated because RLS policies call it in the caller's context
