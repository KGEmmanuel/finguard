
SET session_replication_role = replica;

UPDATE public.audit_vault
   SET actor_display_name = 'Demo CISO',
       ref = CASE WHEN ref LIKE 'by %' THEN 'by Demo CISO' ELSE ref END
 WHERE actor_display_name IS NOT NULL
   AND actor_display_name NOT IN
       ('Demo CISO','S. Duval','M. Chen','L. Petrov','Discovery Scanner','system');

UPDATE public.profiles
   SET display_name = 'Demo CISO'
 WHERE display_name NOT IN
       ('Demo CISO','S. Duval','M. Chen','L. Petrov','Discovery Scanner','system');

UPDATE public.override_events
   SET user_display_name = 'Demo CISO'
 WHERE user_display_name NOT IN
       ('Demo CISO','S. Duval','M. Chen','L. Petrov','Discovery Scanner','system');

UPDATE public.mock_exams
   SET run_by_name = 'Demo CISO'
 WHERE run_by_name NOT IN
       ('Demo CISO','S. Duval','M. Chen','L. Petrov','Discovery Scanner','system');

UPDATE public.mock_exam_downloads
   SET downloaded_by_name = 'Demo CISO'
 WHERE downloaded_by_name NOT IN
       ('Demo CISO','S. Duval','M. Chen','L. Petrov','Discovery Scanner','system');

SET session_replication_role = origin;

DO $$
DECLARE
  v_demo_uid uuid := 'f7597336-ff0e-4517-b8ee-bd0c4150c651';
  v_event_id text := 'EVT-88195';
  v_justification text := 'Client memo required for quarter-end rebalancing; SSN was redacted at source before model call. Approved under WM-SOP-114 §3 with compliance cc.';
  v_hash text;
  v_created timestamptz := '2026-07-06 11:32:00+00';
BEGIN
  v_hash := encode(digest(v_justification, 'sha256'), 'hex');
  IF NOT EXISTS (
    SELECT 1 FROM public.override_events
     WHERE event_id = v_event_id AND user_display_name = 'S. Duval'
  ) THEN
    INSERT INTO public.override_events
      (event_id, user_id, user_display_name, user_role, justification, evidence_hash, created_at)
    VALUES
      (v_event_id, v_demo_uid, 'S. Duval', 'md', v_justification, v_hash, v_created);

    INSERT INTO public.audit_vault
      (hash, kind, ref, actor_id, actor_display_name, payload, created_at)
    VALUES
      (v_hash, 'override_signed', v_event_id || ' → FINRA 2210(d)',
       v_demo_uid, 'S. Duval',
       jsonb_build_object(
         'event_id', v_event_id,
         'agent', 'Cavendish Wealth Advisor',
         'tier', 2,
         'rule', 'PII-002',
         'justification', v_justification,
         'signed_at', to_char(v_created AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
         'approver_role', 'md'
       ),
       v_created);
  END IF;
END $$;

INSERT INTO public.outcome_kpis (outcome_key, kpi_key, value, unit, window_label, measured_at)
VALUES ('B', 'override_coverage_pct', 50, 'percent', 'live', now());
