-- M3.3 — pgvector 도입 (text-embedding-3-large @ 1536 dim).
-- Spec: docs/build-spec/02-schema.md §6, 09-q3-build.md M3.3.
-- Supabase 는 vector extension 자동 가용.

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE nodes
  ADD COLUMN IF NOT EXISTS text_embedding vector(1536);

-- ivfflat: 1만 노드 가정 lists=100. 그 이상이면 lists=sqrt(N) 권장.
-- analyze 후 plan 안정화. probes 는 SET 으로 런타임 조정.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'nodes_embedding_idx'
  ) THEN
    EXECUTE 'CREATE INDEX nodes_embedding_idx
      ON nodes USING ivfflat (text_embedding vector_cosine_ops)
      WITH (lists = 100)';
  END IF;
END$$;

-- 임베딩 누락 published 노드 추적용 view.
CREATE OR REPLACE VIEW nodes_pending_embedding AS
SELECT id, type, label, grade, signature, content, item_difficulty, created_at
FROM nodes
WHERE text_embedding IS NULL
  AND status = 'published';

COMMIT;
