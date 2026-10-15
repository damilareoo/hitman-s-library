-- Phase 1: Design Drift (weeks 1–2).
--
-- Stores a perceptual hash of the desktop capture alongside each snapshot so
-- the "redesigned" badge can compare screenshots without fetching images at
-- read time. Rows written before this column existed keep NULL and fall back
-- to palette + typography drift.

ALTER TABLE extraction_history
  ADD COLUMN IF NOT EXISTS screenshot_hash TEXT;
