/**
 * KST 주 경계 utilities — M3.5.
 * 일~토 1주, 토 23:00 KST 가 snapshot 시점.
 */

const KST_OFFSET_MS = 9 * 3600 * 1000

/** UTC Date → KST 시간 기준 'YYYY-MM-DD'. */
export function isoDateInKst(d: Date = new Date()): string {
  const kst = new Date(d.getTime() + KST_OFFSET_MS)
  const y = kst.getUTCFullYear()
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0")
  const day = String(kst.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * KST 토요일 23:00 = "이번 주 끝" 지점.
 * d 가 그 시점 이전이면 직전 토요일, 이후면 그 토요일.
 * 반환은 UTC Date (DB timestamp 비교용).
 */
export function nearestSaturdayBoundary(d: Date = new Date()): Date {
  const kst = new Date(d.getTime() + KST_OFFSET_MS)
  // KST day-of-week: 0=일, 6=토
  const dow = kst.getUTCDay()
  // 이번 주 토요일 23:00 KST
  const thisSat = new Date(
    Date.UTC(
      kst.getUTCFullYear(),
      kst.getUTCMonth(),
      kst.getUTCDate() - dow + 6,
      23 - 9, // KST 23 = UTC 14
      0,
      0,
    ),
  )
  if (d < thisSat) {
    // 직전 토 23:00 KST
    return new Date(thisSat.getTime() - 7 * 24 * 3600 * 1000)
  }
  return thisSat
}

/** 가장 최근 토요일 23:00 KST 의 'YYYY-MM-DD'. */
export function snapshotIsoDate(d: Date = new Date()): string {
  return isoDateInKst(nearestSaturdayBoundary(d))
}

/** N주 전 토요일 boundary. */
export function weeksAgoSaturday(weeksBack: number, d: Date = new Date()): Date {
  return new Date(
    nearestSaturdayBoundary(d).getTime() -
      weeksBack * 7 * 24 * 3600 * 1000,
  )
}

export function isoDateAddDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
