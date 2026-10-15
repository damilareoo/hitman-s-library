-- Work order A5: optional contact on site requests.
--
-- A request with an email is one the reviewer can answer. Single column,
-- nullable; the form sends it only when the visitor types one.

ALTER TABLE design_requests
  ADD COLUMN IF NOT EXISTS email TEXT;
