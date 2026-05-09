-- M3.5 — 주간 약점 변화 framing 의 truth source.
-- Spec: docs/build-spec/09-q3-build.md M3.5.

BEGIN;

CREATE TABLE IF NOT EXISTS pattern_state_snapshots (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot_date TEXT NOT NULL,                    -- 'YYYY-MM-DD' (KST 토요일)
  pattern_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  theta REAL NOT NULL,
  attempt_count INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, snapshot_date, pattern_id)
);

CREATE INDEX IF NOT EXISTS pss_user_date_idx
  ON pattern_state_snapshots(user_id, snapshot_date);

COMMIT;
