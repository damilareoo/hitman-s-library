-- Product split: five new kinds (AI, Developer, Work, Money, Consumer) grow
-- the kind one-hot from 9 to 13 blocks, so the fused embedding goes from 605
-- to 609 dimensions. Old vectors are incomparable and must be re-embedded
-- (scripts/backfill-embeddings.mjs --force); the similar query simply finds
-- no neighbors for stale rows until then, it never errors.

DROP INDEX IF EXISTS design_sources_embedding_hnsw;
ALTER TABLE design_sources ALTER COLUMN embedding TYPE vector(609);
CREATE INDEX IF NOT EXISTS design_sources_embedding_hnsw
  ON design_sources USING hnsw (embedding vector_cosine_ops);
