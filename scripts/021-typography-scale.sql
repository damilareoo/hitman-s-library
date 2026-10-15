-- Work order A6: measured type scale on typography rows.
--
-- The Type tab showed a bare weight with no size or line-height. The browser
-- already measures both when inferring roles; now it stores them. Rows
-- predating this migration keep NULLs and the tab omits the scale line.

ALTER TABLE design_typography
  ADD COLUMN IF NOT EXISTS sample_size_px REAL;

ALTER TABLE design_typography
  ADD COLUMN IF NOT EXISTS sample_line_height TEXT;
