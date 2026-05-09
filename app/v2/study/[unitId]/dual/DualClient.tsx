"use client"

/**
 * 듀얼 패널 클라 — 좌(chunk) + 중(그래프) + 우(코치) 3-pane.
 * Spec: 08-q2-build.md M2.6 (B).
 *
 * 데스크탑: react-resizable-panels horizontal.
 * 모바일 (sm: 미만): 탭 전환.
 */

import { useState } from "react"
import Link from "next/link"
import { ChunksPane } from "./_components/ChunksPane"
import { GraphPane } from "./_components/GraphPane"
import { CoachPane } from "./_components/CoachPane"

interface ChunkRow {
  id: string
  ordinal: number
  sectionTitle: string | null
  pageStart: number | null
  content: string
}

export interface DualClientProps {
  chunks: ChunkRow[]
  hasDocument: boolean
  firstItemId: string | null
}

type Tab = "chunks" | "graph" | "coach"

export function DualClient({
  chunks,
  hasDocument,
  firstItemId,
}: DualClientProps) {
  const [coachPrefill, setCoachPrefill] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("chunks")

  const handleTextSelect = (text: string, source: { ordinal: number }) => {
    const wrap = `다음을 설명해주세요:\n\n${text}\n\n(청크 ${source.ordinal})`
    setCoachPrefill(wrap)
    setActiveTab("coach")
  }

  return (
    <>
      {/* 모바일 탭 — sm: 미만 */}
      <div
        className="flex border-b border-black/5 bg-white sm:hidden"
        role="tablist"
      >
        {([
          ["chunks", "PDF"],
          ["graph", "지도"],
          ["coach", "코치"],
        ] as [Tab, string][]).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={activeTab === k}
            onClick={() => setActiveTab(k)}
            className={`flex-1 px-3 py-2 text-xs ${
              activeTab === k
                ? "border-b-2 border-black text-black"
                : "text-black/55"
            }`}
            data-testid={`dual-tab-${k}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 모바일 — 단일 pane */}
      <div className="flex flex-1 overflow-hidden sm:hidden">
        {activeTab === "chunks" && (
          <ChunksPane
            chunks={chunks}
            hasDocument={hasDocument}
            onTextSelect={handleTextSelect}
          />
        )}
        {activeTab === "graph" && <GraphPane firstItemId={firstItemId} />}
        {activeTab === "coach" && (
          <CoachPane firstItemId={firstItemId} prefillText={coachPrefill} />
        )}
      </div>

      {/* 데스크탑 — 3 pane CSS grid (Q2 단순화. resize handle 은 후속 polish). */}
      <div
        className="hidden flex-1 overflow-hidden sm:grid"
        style={{ gridTemplateColumns: "minmax(280px, 1fr) minmax(240px, 1fr) minmax(320px, 1.1fr)" }}
      >
        <div className="overflow-hidden border-r border-black/5">
          <ChunksPane
            chunks={chunks}
            hasDocument={hasDocument}
            onTextSelect={handleTextSelect}
          />
        </div>
        <div className="overflow-hidden border-r border-black/5">
          <GraphPane firstItemId={firstItemId} />
        </div>
        <div className="overflow-hidden">
          <CoachPane firstItemId={firstItemId} prefillText={coachPrefill} />
        </div>
      </div>

      {!hasDocument && (
        <div className="border-t border-amber-200 bg-amber-50 px-6 py-2 text-center text-xs text-amber-900">
          업로드된 PDF 가 없어요.{" "}
          <Link href="/upload" className="underline font-medium">
            PDF 업로드
          </Link>
          하면 chunks 가 좌측 패널에 채워집니다.
        </div>
      )}
    </>
  )
}
