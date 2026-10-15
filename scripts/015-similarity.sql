-- Phase 2: visual similarity search (weeks 1–2).
--
-- One embedding per site on the site row: CLIP image features + OKLCH
-- palette histogram + font-family hash + kind one-hot, fused in
-- lib/similarity.ts (see EMBED_DIMS). HNSW over cosine distance keeps the
-- neighbor query at a few ms.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE design_sources
  ADD COLUMN IF NOT EXISTS embedding vector(605);

-- HNSW needs pgvector >= 0.8.0 (prod runs 0.8.0 — verified 2026-10-14).
-- Rows with NULL embeddings (written before backfill) are skipped by the
-- query itself, so the index never has to explain them.
CREATE INDEX IF NOT EXISTS design_sources_embedding_hnsw
  ON design_sources USING hnsw (embedding vector_cosine_ops);
