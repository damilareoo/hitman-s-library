-- 033: our own visit counter. One row per page view or tracked click.
-- No names, emails or addresses: a random visitor id from the browser, the
-- platform it came from, its device class, and the country Cloudflare reports.
CREATE TABLE IF NOT EXISTS hits (
  id        bigserial PRIMARY KEY,
  at        timestamptz NOT NULL DEFAULT now(),
  kind      text NOT NULL,             -- 'view', 'open', 'outbound', 'export', 'copy', or a product event
  visitor   text NOT NULL,
  session   text NOT NULL,
  team      text,                      -- set when a signed team cookie is present
  path      text,
  site      text,                      -- site slug or id the hit is about
  target    text,                      -- outbound host, export format, surface
  source    text,                      -- 'X', 'LinkedIn', 'Google', 'Direct', or a referrer host
  referrer  text,                      -- referrer host only
  campaign  text,                      -- utm_campaign
  landing   boolean NOT NULL DEFAULT false,
  device    text,
  browser   text,
  os        text,
  country   text
);
CREATE INDEX IF NOT EXISTS hits_at ON hits (at DESC);
CREATE INDEX IF NOT EXISTS hits_visitor ON hits (visitor);
CREATE INDEX IF NOT EXISTS hits_team ON hits (team) WHERE team IS NOT NULL;
