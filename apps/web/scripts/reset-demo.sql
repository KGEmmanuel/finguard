-- scripts/reset-demo.sql
-- Nightly reset for the Finguard PUBLIC DEMO Supabase project only.
-- DO NOT run against a production Cognita GRC project — it truncates user data.
--
-- Recommended cadence: pg_cron nightly at 03:00 UTC.
--   SELECT cron.schedule('finguard-demo-reset', '0 3 * * *',
--     $$ SELECT public.reset_finguard_demo(); $$);

CREATE OR REPLACE FUNCTION public.reset_finguard_demo()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Wipe operational data (children first for FK order)
  DELETE FROM public.override_events;
  DELETE FROM public.mock_exam_downloads;
  DELETE FROM public.mock_exams;
  DELETE FROM public.guardrail_events;
  DELETE FROM public.discovery_stats;
  DELETE FROM public.agents;

  -- Wipe audit vault (uses trigger-blocked DELETE; disable + re-enable)
  ALTER TABLE public.audit_vault DISABLE TRIGGER USER;
  DELETE FROM public.audit_vault;
  ALTER TABLE public.audit_vault ENABLE TRIGGER USER;

  -- Optional: drop non-demo profiles/users. Uncomment if you want a clean slate.
  -- DELETE FROM auth.users WHERE email <> 'demo@cognita.io';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reset_finguard_demo() FROM PUBLIC, anon, authenticated;
