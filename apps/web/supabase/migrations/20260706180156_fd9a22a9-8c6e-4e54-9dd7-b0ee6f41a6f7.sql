
CREATE TABLE public.outcome_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outcome_key TEXT NOT NULL,
  kpi_key TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'count',
  window_label TEXT NOT NULL DEFAULT 'daily',
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX outcome_kpis_kpi_measured_idx
  ON public.outcome_kpis (kpi_key, measured_at DESC);

GRANT SELECT ON public.outcome_kpis TO authenticated;
GRANT ALL    ON public.outcome_kpis TO service_role;

ALTER TABLE public.outcome_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MD and CISO can read KPI history"
  ON public.outcome_kpis
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'md'::public.app_role)
    OR public.has_role(auth.uid(), 'ciso'::public.app_role)
  );
