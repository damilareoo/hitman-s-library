-- Phase 0: append-only extraction history (week 1).
--
-- Re-running extraction never destroys the previous snapshot. Every run
-- appends a versioned row to extraction_history and repoints
-- design_sources.current_extraction_id at it. Reads resolve through that
-- pointer and fall back to the legacy per-source tables when it is NULL,
-- so rows written before this migration keep rendering unchanged.
--
-- Also drops the dead `industry` column. Nothing reads it since `kind`
-- replaced it (see scripts/011-site-kind.sql); it was only a record of how
-- a source was originally filed, and Phase 0 ends that record.

CREATE TABLE IF NOT EXISTS extraction_history (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL REFERENCES design_sources(id) ON DELETE CASCADE,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  screenshot_url TEXT,
  mobile_screenshot_url TEXT,
  palette JSONB NOT NULL DEFAULT '[]',
  typography JSONB NOT NULL DEFAULT '[]',
  assets JSONB NOT NULL DEFAULT '[]',
  extractor_version TEXT NOT NULL DEFAULT 'phase0-append-only'
);

CREATE INDEX IF NOT EXISTS extraction_history_site_idx
  ON extraction_history (site_id, captured_at DESC);

ALTER TABLE design_sources
  ADD COLUMN IF NOT EXISTS current_extraction_id INTEGER;

-- Circular reference (history -> sources -> history), so the constraint goes
-- on after both sides exist. Idempotent for re-runs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'design_sources_current_extraction_fk'
  ) THEN
    ALTER TABLE design_sources
      ADD CONSTRAINT design_sources_current_extraction_fk
      FOREIGN KEY (current_extraction_id)
      REFERENCES extraction_history(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE design_sources DROP COLUMN IF EXISTS industry;
DROP INDEX IF EXISTS idx_design_sources_industry;
