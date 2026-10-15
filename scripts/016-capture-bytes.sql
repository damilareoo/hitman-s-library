-- Phase 2 hardening: blank-capture guard for similarity search.
--
-- Failed captures (a blank frame, a salvaged og:image) embed as
-- near-identical "empty" vectors and surface as each other's neighbors.
-- screenshot_bytes (the capture's file size, HEAD-measured) separates them:
-- blanks sit under ~35KB while the library median is ~426KB. The similar
-- query excludes og-sourced and tiny captures as neighbor *candidates*;
-- any site can still query its own neighbors.
--
-- Rows predating the backfill keep NULL and stay eligible (COALESCE in the
-- query), so this column can only ever narrow, never hide the library.

ALTER TABLE design_sources
  ADD COLUMN IF NOT EXISTS screenshot_bytes INTEGER;
