"use client"

/**
 * 통합 워크스페이스 클라 셸 — 3-pane (좌 PDF / 가운데 풀이 / 우 코치).
 *
 * 13 lock:
 *   1. 패널 비율 좌 280 / flex / 우 380 (resizable)
 *   2. 그래프 토글 — 우 패널 탭 (학습 지도 탭은 Phase 2)
 *   3. AI 사용량 헤더 emerald 캡슐
 *   9. /v2/home → 워크스페이스 redirect (Task 7)
 *
 * Phase 1A 한계:
 *   - 가운데는 SolveClient 그대로 (자체 헤더/푸터 유지) — 시안 정합성은 Phase 1B 에서
 *   - 우측 "학습 지도" 탭 placeholder (코치 swap 미구현)
 *   - URL state mode swap 미구현 (nuqs 도입은 했으나 Phase 2 에서 활용)
 */

import { useCallback, useEffect } from "react"
import Link from "next/link"
import { Sparkles, Map } from "lucide-react"
import { Group, Panel, Separator } from "react-resizable-panels"
import { useQueryState, parseAsStringEnum } from "nuqs"
import type { ItemResponse } from "@/lib/api/schemas/items"
import type { TierKey } from "@/lib/billing/tier"
import { ChunksPane } from "@/app/v2/study/[unitId]/dual/_components/ChunksPane"
import { CoachPanel } from "@/app/v2/solve/_components/CoachPanel"
import { GraphPanel } from "@/app/v2/solve/_components/GraphPanel"
import { SolveClient } from "@/app/v2/solve/[itemId]/SolveClient"
import { useCoachStore } from "@/app/v2/_components/store/coach-store"
import { PdfPageViewer } from "./_components/PdfPageViewer"

const rightParser = parseAsStringEnum(["coach", "graph"]).withDefault("coach")
const modeParser = parseAsStringEnum([
  "practice",
  "challenge",
  "retry",
  "daily",
]).withDefault("practice")
type WorkspaceMode = "practice" | "challenge" | "retry" | "daily"
// SolveClient 가 받는 mode 는 'daily' 를 from prop 으로 처리하므로 매핑
const toSolveMode = (
  m: WorkspaceMode,
): "practice" | "challenge" | "retry" =>
  m === "daily" ? "practice" : m

interface Chunk {
  id: string
  ordinal: number
  sectionTitle: string | null
  pageStart: number | null
  content: string
}

interface Props {
  item: ItemResponse
  userId: string
  userEmail: string
  tier: TierKey
  usage: { used: number; limit: number | "unlimited"; resetAtIso: string | null }
  chunks: Chunk[]
  hasDocument: boolean
  docTitle: string | null
  pdfSignedUrl: string | null
}

export function WorkspaceClient({
  item,
  userId,
  userEmail,
  tier,
  usage,
  chunks,
  hasDocument,
  docTitle,
  pdfSignedUrl,
}: Props) {
  const setCoachOpen = useCoachStore((s) => s.setOpen)
  const setInputPrefill = useCoachStore((s) => s.setInputPrefill)
  const highlightNodeIds = useCoachStore((s) => s.highlightNodeIds)
  const [right, setRight] = useQueryState("right", rightParser)
  const [mode] = useQueryState("mode", modeParser)

  useEffect(() => {
    setCoachOpen(true)
  }, [setCoachOpen])

  /**
   * View Transitions — 우 패널 swap 시 browser-native crossfade.
   * React 19.2 stable 은 ViewTransition 컴포넌트 미노출 → document.startViewTransition 직접 호출.
   * 미지원 브라우저(Safari/Firefox 17.x-)는 즉시 swap fallback.
   */
  const swapRight = useCallback(
    (next: "coach" | "graph") => {
      type DocWithVT = Document & {
        startViewTransition?: (cb: () => void) => unknown
      }
      const doc = document as DocWithVT
      if (typeof doc.startViewTransition === "function") {
        doc.startViewTransition(() => {
          void setRight(next)
        })
      } else {
        void setRight(next)
      }
    },
    [setRight],
  )

  const handleTextSelect = (text: string, source: { ordinal: number }) => {
    setInputPrefill(
      `다음을 설명해주세요:\n\n${text}\n\n(청크 ${source.ordinal})`,
    )
  }

  const usageLabel =
    usage.limit === "unlimited" ? "∞" : `${usage.used}/${usage.limit}`

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-zinc-50">
      <header
        className="flex items-center justify-between gap-4 border-b border-black/8 bg-white/90 backdrop-blur px-6 py-3 shrink-0"
        data-testid="workspace-header"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/v2/home"
            className="font-extrabold tracking-[0.18em] text-xs text-black/85"
          >
            DEEPEN<span className="opacity-40">.LAB</span>
          </Link>
          <span className="text-black/20">/</span>
          <nav className="flex items-center gap-1 text-xs text-black/60">
            <span>수학Ⅱ · 미분/적분</span>
            <span className="text-black/25 mx-1">›</span>
            <span className="font-mono text-black/45">
              {item.itemSource ?? "문제"} {item.itemNumber ?? ""}
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* 약점 framing — 그래프 강등 표면 1. 클릭 → 우 패널 학습지도 swap (lock 2) */}
          <button
            type="button"
            onClick={() => swapRight(right === "graph" ? "coach" : "graph")}
            aria-pressed={right === "graph"}
            className={`hidden md:flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              right === "graph"
                ? "border-rose-300 bg-rose-100 text-rose-800 ring-2 ring-rose-200"
                : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
            data-testid="weakness-chip"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            약점 −2개
            <span className="text-rose-400">›</span>
          </button>

          {/* AI 사용량 캡슐 (오르조 차용) */}
          <div
            className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs"
            data-testid="ai-quota-capsule"
          >
            <span className="text-emerald-700 font-semibold">AI</span>
            <span className="font-mono text-emerald-900 tabular-nums">
              {usageLabel}
            </span>
            <span className="text-[10px] text-emerald-600/70">
              {tier === "free" ? "체험" : "오늘"}
            </span>
          </div>

          <span className="hidden max-w-[160px] truncate sm:inline text-xs text-black/55">
            {userEmail}
          </span>
        </div>
      </header>

      <Group orientation="horizontal" className="flex-1">
        {/* LEFT — PDF chunks */}
        <Panel defaultSize={22} minSize={15} maxSize={35} id="left">
          <aside className="flex h-full flex-col border-r border-black/8 bg-white/60">
            <div className="flex items-center justify-between border-b border-black/5 px-4 py-3 shrink-0">
              <div className="text-[10px] uppercase tracking-widest text-black/45 truncate">
                📄 {docTitle ?? "강의안 (PDF 미선택)"}
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {hasDocument ? (
                <ChunksPane
                  chunks={chunks}
                  hasDocument={hasDocument}
                  onTextSelect={handleTextSelect}
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-xs text-black/45">
                  업로드한 PDF 가 없어요.
                  <br />
                  <Link
                    href="/upload"
                    className="mt-2 inline-block underline"
                  >
                    PDF 업로드 →
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </Panel>

        <Separator className="w-px bg-black/8 hover:w-1 hover:bg-emerald-400/40 transition-all" />

        {/* CENTER — Phase 1B: PDF (위 60%) + SolveClient (아래 40%) */}
        <Panel defaultSize={50} minSize={35} id="center">
          <section
            className="flex h-full flex-col overflow-hidden bg-white/30"
            data-testid="workspace-hero"
          >
            {pdfSignedUrl ? (
              <>
                <div className="h-[60%] min-h-0 border-b border-black/8">
                  <PdfPageViewer
                    signedUrl={pdfSignedUrl}
                    title={docTitle ?? "강의안"}
                  />
                </div>
                <div
                  className="h-[40%] min-h-0 overflow-y-auto"
                  data-testid="hero-solve-region"
                >
                  <SolveClient
                    item={item}
                    userId={userId}
                    mode={toSolveMode(mode)}
                    from={mode === "daily" ? "daily" : null}
                    embedded
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <SolveClient
                    item={item}
                    userId={userId}
                    mode={toSolveMode(mode)}
                    from={mode === "daily" ? "daily" : null}
                    embedded
                  />
              </div>
            )}
          </section>
        </Panel>

        <Separator className="w-px bg-black/8 hover:w-1 hover:bg-emerald-400/40 transition-all" />

        {/* RIGHT — Coach ↔ 학습 지도 swap (lock 2). nuqs ?right=coach|graph */}
        <Panel defaultSize={28} minSize={20} maxSize={40} id="right">
          <aside className="flex h-full flex-col border-l border-black/8 bg-white/85">
            <div className="flex border-b border-black/5 shrink-0" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={right === "coach"}
                onClick={() => swapRight("coach")}
                className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium transition ${
                  right === "coach"
                    ? "border-b-2 border-emerald-600 text-black"
                    : "text-black/45 hover:text-black/70"
                }`}
                data-testid="right-tab-coach"
              >
                <Sparkles
                  size={12}
                  className={right === "coach" ? "text-emerald-600" : ""}
                />
                AI 코치
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={right === "graph"}
                onClick={() => swapRight("graph")}
                className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium transition relative ${
                  right === "graph"
                    ? "border-b-2 border-rose-500 text-black"
                    : "text-black/45 hover:text-black/70"
                }`}
                data-testid="right-tab-graph"
              >
                <Map
                  size={12}
                  className={right === "graph" ? "text-rose-500" : ""}
                />
                학습 지도
                {right !== "graph" && (
                  <span className="absolute top-2 right-3 h-1.5 w-1.5 rounded-full bg-rose-400" />
                )}
              </button>
            </div>
            <div
              className="flex-1 overflow-hidden"
              style={{ viewTransitionName: "workspace-right-panel" }}
              data-testid={`right-panel-${right}`}
            >
              {right === "coach" ? (
                <CoachPanel itemId={item.id} />
              ) : (
                <div className="h-full overflow-y-auto p-3">
                  <GraphPanel
                    itemId={item.id}
                    highlightNodeIds={highlightNodeIds}
                  />
                </div>
              )}
            </div>
          </aside>
        </Panel>
      </Group>
    </main>
  )
}
