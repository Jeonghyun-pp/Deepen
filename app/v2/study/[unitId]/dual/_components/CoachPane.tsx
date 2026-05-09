"use client"

/**
 * 듀얼 패널의 우측 코치 영역.
 * Spec: 08-q2-build.md M2.6 (B) drag-to-coach.
 *
 * Q2 단순화:
 *   - itemId 가 있으면 (단원 첫 published item) 그걸 컨텍스트로 코치 호출.
 *   - 없으면 "풀이를 시작해야 코치가 컨텍스트를 가집니다" 안내.
 *   - prefillText 변경 → CoachPanel 의 input 에 자동 채움 (사용자가 send).
 *
 * 본 컴포넌트는 항상 노출 (CoachPanel 의 FAB toggle 비활성).
 */

import { useEffect } from "react"
import Link from "next/link"
import { useCoachStore } from "@/app/v2/_components/store/coach-store"
import { CoachPanel } from "@/app/v2/solve/_components/CoachPanel"

export interface CoachPaneProps {
  firstItemId: string | null
  prefillText: string | null
}

export function CoachPane({ firstItemId, prefillText }: CoachPaneProps) {
  const setOpen = useCoachStore((s) => s.setOpen)
  const setInputPrefill = useCoachStore((s) => s.setInputPrefill)

  // 듀얼 모드에선 코치 패널을 항상 열어둠.
  useEffect(() => {
    setOpen(true)
  }, [setOpen])

  // prefill 변경 시 input 채우기 (사용자가 send).
  useEffect(() => {
    if (prefillText) setInputPrefill(prefillText)
  }, [prefillText, setInputPrefill])

  if (!firstItemId) {
    return (
      <div
        className="flex h-full items-center justify-center bg-white px-6 text-center text-xs text-black/55"
        data-testid="coach-pane-empty"
      >
        AI 코치는 풀이 컨텍스트가 필요해요.
        <br />
        <Link href="/v2/study/default" className="mt-2 inline-block underline">
          단원으로 돌아가 풀이 시작 →
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-white" data-testid="coach-pane">
      {/* CoachPanel 은 fixed 우측 패널로 자체 위치하므로 듀얼 모드 안에서는
         그 패널이 자체 보이게 둠. CoachPanel 자체 fixed positioning 그대로. */}
      <CoachPanel itemId={firstItemId} />
    </div>
  )
}
