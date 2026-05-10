/**
 * Toss orderId 생성/파싱.
 *
 * 형식: `dpn_<tier>_<nonce>` (≤ 64 chars, Toss 제한 충족).
 *   - tier: 'p' = pro, 'pp' = pro_plus
 *   - nonce: 16-byte hex (32 chars) — 충돌 방지 + non-guessable.
 *
 * userId 는 invoices 행에 별도 저장 (encode 안 함 — URL 노출 회피).
 */

import { randomBytes } from "node:crypto"
import type { TierKey } from "./tier"

const TIER_CODE: Record<Exclude<TierKey, "free">, string> = {
  pro: "p",
  pro_plus: "pp",
}

const TIER_FROM_CODE: Record<string, Exclude<TierKey, "free">> = {
  p: "pro",
  pp: "pro_plus",
}

export function generateOrderId(tier: Exclude<TierKey, "free">): string {
  const nonce = randomBytes(16).toString("hex")
  return `dpn_${TIER_CODE[tier]}_${nonce}`
}

export function parseOrderId(
  orderId: string,
): { tier: Exclude<TierKey, "free">; nonce: string } | null {
  const m = /^dpn_(p|pp)_([0-9a-f]{32})$/.exec(orderId)
  if (!m) return null
  const tierCode = m[1]
  const tier = TIER_FROM_CODE[tierCode]
  if (!tier) return null
  return { tier, nonce: m[2] }
}
