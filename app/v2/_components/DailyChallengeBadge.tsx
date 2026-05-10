"use client"

/**
 * DailyChallengeBadge — 홈 헤더의 데일리 챌린지 chip.
 * Spec: 09-q3-build.md M3.4.
 *
 * 동작:
 *   1) /api/recommend/daily-challenge 호출 (cached 우선, 없으면 즉석)
 *   2) chip "오늘의 도전 · 3문제" 노출 + 클릭 시 첫 itemId 로 진입
 *   3) 0개면 비표시
 */
import { useEffect, useState } from "react"
import Link from "next/link"

interface ChallengeItem {
  itemId: string
  patternId: string
  patternLabel: string
}

interface DailyChallengeResponse {
  date: string
  items: ChallengeItem[]
  copy: string | null
  cached: boolean
}

export function DailyChallengeBadge() {
  const [data, setData] = useState<DailyChallengeResponse | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/recommend/daily-challenge", { credentials: "include" })
      .then((r) => (r.ok ? (r.json() as Promise<DailyChallengeResponse>) : null))
      .then((j) => {
        if (cancelled) return
        setData(j)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
    return () => {
      cancelled = true
    }
  }, [])

  if (!loaded) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-[11px] text-black/40"
        data-testid="daily-challenge-loading"
      >
        오늘의 도전 …
      </span>
    )
  }
  if (!data || data.items.length === 0) return null

  const ids = data.items.map((it) => it.itemId)
  const firstId = ids[0]
  // 끊김2 fix — 3문제 chaining 위해 batch CSV + idx=0 동봉.
  // SolveClient 가 from=daily 일 때 마지막 idx 도달 시 /v2/home?dailyDone=1 로 이동.
  const params = new URLSearchParams({
    from: "daily",
    batch: ids.join(","),
    idx: "0",
  })
  return (
    <Link
      href={`/v2/solve/${firstId}?${params.toString()}`}
      data-testid="daily-challenge-badge"
      className="group inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
      title={data.copy ?? `약점 ${data.items.length}문제 도전`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      <span>오늘의 도전 · {data.items.length}문제</span>
      <span className="ml-0.5 text-emerald-600 group-hover:translate-x-0.5 transition">→</span>
    </Link>
  )
}
