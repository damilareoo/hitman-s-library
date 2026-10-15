-- Work order 1 (performance): thumbnails as re-encoded blobs.
--
-- Card thumbnails were hotlinked origin CDNs at full original size (animated
-- GIFs included). thumbnail_optimized_url carries a 640px webp first-frame
-- re-encode in our own blob storage; reads prefer it and keep the hotlink
-- only as a last resort until the backfill covers the row.

ALTER TABLE design_sources
  ADD COLUMN IF NOT EXISTS thumbnail_optimized_url TEXT;
