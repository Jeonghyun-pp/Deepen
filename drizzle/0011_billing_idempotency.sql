-- Phase B P0-2 — Toss webhook idempotency 보강.
-- - invoices.toss_order_id: 우리가 발급한 orderId (checkout 시점에 pending 행 생성).
-- - invoices.toss_payment_key: webhook 으로 받은 paymentKey (DONE 이후 채워짐).
-- - 둘 다 중복 시 webhook 재전송으로 보고 즉시 200 OK 반환.

BEGIN;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS toss_order_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_toss_payment_key_uniq
  ON invoices(toss_payment_key)
  WHERE toss_payment_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_toss_order_id_uniq
  ON invoices(toss_order_id)
  WHERE toss_order_id IS NOT NULL;

COMMIT;
