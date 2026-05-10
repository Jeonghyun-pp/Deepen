-- Phase A — onboarding 미연결 fix (끊김1).
-- 4-step onboard 완료 여부 truth source. 미완료면 /v2/home → /v2/onboard/profile redirect.

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMP WITH TIME ZONE;

COMMIT;
