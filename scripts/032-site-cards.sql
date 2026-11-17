-- Link cards: one image per site (its capture on a flat field of one of its
-- own colours), used as the /site/ page's og:image. Rendered by
-- scripts/site-cards.ts on GitHub's free minutes. Additive; the rename covers
-- databases that ran the first draft of this table.
ALTER TABLE IF EXISTS x_cards RENAME TO site_cards;
CREATE TABLE IF NOT EXISTS site_cards (
  source_id   integer PRIMARY KEY REFERENCES design_sources(id) ON DELETE CASCADE,
  image_url   text        NOT NULL,
  field_hex   text        NOT NULL,
  made_at     timestamptz NOT NULL DEFAULT now()
);
-- The daily X post was dropped before launch; its empty table goes with it.
DROP TABLE IF EXISTS x_posts;
