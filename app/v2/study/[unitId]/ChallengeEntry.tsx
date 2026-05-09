"use client"

/**
 * ChallengeEntry — 단원 진입 화면 Pattern 옆 챌린지 시작 버튼.
 * Spec: 09-q3-build.md M3.2 (그래프 우클릭/롱프레스 진입점).
 *
 * Q3 단순화: 우클릭 컨텍스트 메뉴 대신 Pattern 카드 우측 작은 버튼.
 *           uplift 가 필요해지면 그래프 노드 컨텍스트 메뉴로 확장.
 */
import { useState } from "react"
import { useRouter } from "next/navigation"

interface ChallengeEntryProps {
  patternId: string
  patternLabel: string
  userTheta: number | null
  /** 현재 Pattern 의 풀이 가능 Item 갯수 — 0 이면 비활성. */
  itemCount?: number
}

export function ChallengeEntry({
  patternId,
  patternLabel,
  userTheta,
  itemCount = 1,
}: ChallengeEntryProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  if (itemCount === 0) return null

  const start = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch("/api/recommend/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          mode: "challenge",
          targetPatternId: patternId,
          difficultyAnchor: userTheta ?? undefined,
        }),
      })
      if (!res.ok) {
        setBusy(false)
        return
      }
      const data = (await res.json()) as { itemId: string | null }
      if (!data.itemId) {
        setBusy(false)
        return
      }
      const params = new URLSearchParams({
        mode: "challenge",
        pattern: patternId,
        label: patternLabel,
      })
      if (userTheta != null) {
        params.set("anchor", String(Math.min(1, userTheta + 0.1)))
      }
      router.push(`/v2/solve/${data.itemId}?${params.toString()}`)
    } catch {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy}
      data-testid={`challenge-entry-${patternId}`}
      className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
      title="이 유형으로 5연속 정답 도전"
    >
      {busy ? "..." : "챌린지 →"}
    </button>
  )
}
