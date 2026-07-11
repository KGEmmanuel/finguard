
CREATE TABLE public.funnel_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  surface TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'pricing_click',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX funnel_events_created_idx
  ON public.funnel_events (created_at DESC);

GRANT INSERT ON public.funnel_events TO anon, authenticated;
GRANT SELECT ON public.funnel_events TO authenticated;
GRANT ALL    ON public.funnel_events TO service_role;

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can log a funnel click"
  ON public.funnel_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(surface) BETWEEN 1 AND 64
    AND length(kind) BETWEEN 1 AND 32
  );

CREATE POLICY "leadership reads funnel history"
  ON public.funnel_events
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'md'::public.app_role)
    OR public.has_role(auth.uid(), 'ciso'::public.app_role)
  );
