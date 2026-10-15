-- Phase 3: motion hover clips (week 3).
--
-- Clips live in Blob like screenshots; the row only carries the URL and size.
-- motion_error and motion tags ride in metadata (JSONB), following the
-- extraction_error pattern — no new columns for data that is schemaless.
-- Rows predating clips keep NULL and render the static screenshot.

ALTER TABLE design_sources
  ADD COLUMN IF NOT EXISTS motion_clip_url TEXT;

ALTER TABLE design_sources
  ADD COLUMN IF NOT EXISTS motion_bytes INTEGER;
