
-- Extend mock_exams with chain-of-custody metadata
ALTER TABLE public.mock_exams
  ADD COLUMN IF NOT EXISTS requested_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS generation_ms integer,
  ADD COLUMN IF NOT EXISTS filename text,
  ADD COLUMN IF NOT EXISTS manifest jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Append-only download ledger
CREATE TABLE IF NOT EXISTS public.mock_exam_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.mock_exams(id) ON DELETE CASCADE,
  downloaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  downloaded_by_name text NOT NULL,
  downloaded_by_role public.app_role NOT NULL,
  pack_hash text NOT NULL,
  evidence_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.mock_exam_downloads TO authenticated;
GRANT ALL ON public.mock_exam_downloads TO service_role;

ALTER TABLE public.mock_exam_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "downloads readable by authenticated"
  ON public.mock_exam_downloads FOR SELECT TO authenticated USING (true);

CREATE POLICY "downloads insert self"
  ON public.mock_exam_downloads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = downloaded_by);

-- Append-only enforcement (reuse existing block_vault_mutation)
CREATE TRIGGER mock_exam_downloads_no_update
  BEFORE UPDATE ON public.mock_exam_downloads
  FOR EACH ROW EXECUTE FUNCTION public.block_vault_mutation();

CREATE TRIGGER mock_exam_downloads_no_delete
  BEFORE DELETE ON public.mock_exam_downloads
  FOR EACH ROW EXECUTE FUNCTION public.block_vault_mutation();

CREATE INDEX IF NOT EXISTS mock_exam_downloads_exam_idx
  ON public.mock_exam_downloads(exam_id, created_at DESC);
