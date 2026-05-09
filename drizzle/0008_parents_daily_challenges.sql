-- M3.4 — 보호자 등록 + 데일리 챌린지 캐시.
-- Spec: docs/build-spec/09-q3-build.md M3.4.

BEGIN;

-- 보호자 (옵션 A — users 테이블 확장).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS parent_email TEXT,
  ADD COLUMN IF NOT EXISTS parent_consent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS parent_unsubscribed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_parent_report_sent_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS users_parent_consent_idx
  ON users(parent_consent_at)
  WHERE parent_consent_at IS NOT NULL;

-- 매일 cron 결과 캐시. PK (user_id, generated_for_date) 로 멱등성 자동.
CREATE TABLE IF NOT EXISTS daily_challenges (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  generated_for_date TEXT NOT NULL,           -- 'YYYY-MM-DD' (KST 기준)
  items JSONB NOT NULL,                       -- DailyChallengeItem[]
  copy TEXT,                                  -- Haiku 카피
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, generated_for_date)
);

CREATE INDEX IF NOT EXISTS daily_challenges_date_idx
  ON daily_challenges(generated_for_date);

COMMIT;
