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

import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Sparkles, Map, Target, ChevronDown } from "lucide-react"
import { Group, Panel, Separator } from "react-resizable-panels"
import { useQueryState, parseAsStringEnum } from "nuqs"
import type { ItemResponse } from "@/lib/api/schemas/items"
import type { OcrResponse } from "@/lib/api/schemas/ocr"
import type { TierKey } from "@/lib/billing/tier"
import { ChunksPane } from "@/app/v2/_components/ChunksPane"
import { CoachPanel } from "@/app/v2/solve/_components/CoachPanel"
import { GraphPanel } from "@/app/v2/solve/_components/GraphPanel"
import { SolveClient } from "@/app/v2/solve/[itemId]/SolveClient"
import { useCoachStore } from "@/app/v2/_components/store/coach-store"
import { useSolveStore } from "@/app/v2/_components/store/solve-store"

/**
 * PdfPenCanvas — PDF 비트맵과 펜 잉크가 **단일 tldraw 캔버스** 안에 stack 되는 통합 컴포넌트.
 * ssr:false 동적 import 이유:
 *   1) pdfjs-dist 가 모듈 평가 시 브라우저 전용 `DOMMatrix` 를 참조 (SSR RuntimeError)
 *   2) tldraw 도 브라우저 전용
 *
 * 교체 배경 (이전 = PdfPageViewer + PencilPanel(overlay) 분리):
 *   - react-pdf 캔버스 위에 tldraw 캔버스를 absolute 오버레이 → 두 GPU 레이어 / 두 페인트 클럭
 *   - DPR sub-px drift + 1~2 프레임 컴포지터 지연 = 잉크가 PDF 위에 안 놓이고 떠 있는 느낌
 *   - Goodnotes Web (web.dev case-study) · tldraw PDF editor 모두 단일 캔버스 + image asset 패턴
 *     으로 동일 문제를 해결. 본 컴포넌트가 그 패턴.
 */
const PdfPenCanvas = dynamic(
  () =>
    import("./_components/PdfPenCanvas").then((m) => ({
      default: m.PdfPenCanvas,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-white text-xs text-black/45">
        PDF 캔버스 로딩 중…
      </div>
    ),
  },
)

const rightParser = parseAsStringEnum(["coach", "graph"]).withDefault("coach")
const modeParser = parseAsStringEnum([
  "practice",
  "challenge",
  "retry",
  "daily",
  "exam",
  "recovery",
]).withDefault("practice")
type WorkspaceMode =
  | "practice"
  | "challenge"
  | "retry"
  | "daily"
  | "exam"
  | "recovery"
// SolveClient 가 받는 mode 는 'daily' 를 from prop 으로 처리하므로 매핑.
// exam/recovery 는 그대로 통과.
const toSolveMode = (
  m: WorkspaceMode,
): "practice" | "challenge" | "retry" | "exam" | "recovery" =>
  m === "daily" ? "practice" : m

interface Chunk {
  id: string
  ordinal: number
  sectionTitle: string | null
  pageStart: number | null
  content: string
}

interface ChallengeCtx {
  targetPatternId: string
  patternLabel: string
  startingDifficulty: number
  consecutiveCorrect: number
  consecutiveWrong: number
  levelsCleared: number
}

interface RetryCtx {
  storedItemId: string
  recapPatternIds: string[]
  storedItemLabel: string
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
  /** pattern_state.theta < 0.4 인 Pattern 수. 0 이면 캡슐 hide. */
  weakCount: number
  /** mode='challenge' 일 때 URL 직렬화된 ctx. 없으면 null. */
  challengeCtx: ChallengeCtx | null
  /** mode='retry' 일 때 URL 직렬화된 ctx. */
  retryCtx: RetryCtx | null
  /** item.patternIds[0] 의 라벨 — 챌린지 진입 UI 에서 사용. 없으면 빈 문자열. */
  firstPatternLabel: string
  /** Stage 1: daily batch chaining 지원. SolveClient 가 from='daily'+batch[] 로 인식. */
  batch: string[] | null
  batchIdx: number
  fromDaily: boolean
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
  weakCount,
  challengeCtx,
  retryCtx,
  firstPatternLabel,
  batch,
  batchIdx,
  fromDaily,
}: Props) {
  const router = useRouter()
  const setCoachOpen = useCoachStore((s) => s.setOpen)
  const setInputPrefill = useCoachStore((s) => s.setInputPrefill)
  const highlightNodeIds = useCoachStore((s) => s.highlightNodeIds)
  const [right, setRight] = useQueryState("right", rightParser)
  const [mode] = useQueryState("mode", modeParser)
  const [modeMenuOpen, setModeMenuOpen] = useState(false)
  const modeMenuRef = useRef<HTMLDivElement | null>(null)

  // dropdown outside-click 닫기.
  useEffect(() => {
    if (!modeMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (
        modeMenuRef.current &&
        !modeMenuRef.current.contains(e.target as Node)
      ) {
        setModeMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [modeMenuOpen])

  const enterPracticeMode = useCallback(() => {
    setModeMenuOpen(false)
    // mode 만 reset — challenge/retry ctx URL params 제거.
    router.replace(`/v2/workspace/${item.id}?mode=practice`, { scroll: false })
  }, [router, item.id])

  const enterChallengeMode = useCallback(() => {
    setModeMenuOpen(false)
    const targetPatternId = item.patternIds[0]
    if (!targetPatternId) return
    const anchor = item.itemDifficulty ?? 0.5
    const params = new URLSearchParams({
      mode: "challenge",
      pattern: targetPatternId,
      label: firstPatternLabel || "유형 챌린지",
      anchor: String(anchor),
      streak: "0",
      wrong: "0",
      cleared: "0",
    })
    router.replace(`/v2/workspace/${item.id}?${params.toString()}`, {
      scroll: false,
    })
  }, [router, item.id, item.patternIds, item.itemDifficulty, firstPatternLabel])

  // 펜슬 (Phase 4 Path D, 단일 캔버스): PDF + 펜이 같은 tldraw 카메라 안에서 함께 렌더.
  // 더이상 absolute overlay 아님 — PdfPenCanvas 가 export 한 PNG 를 workspace 가 받아
  // /api/ocr → SolveClient(embedded) 에 prop 주입.
  const [pencilPng, setPencilPng] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<OcrResponse | null>(null)
  const [ocrPending, setOcrPending] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)

  const handlePencilExport = useCallback(
    async (png: string | null) => {
      setPencilPng(png)
      setOcrError(null)
      if (!png) {
        setOcrResult(null)
        return
      }
      setOcrPending(true)
      try {
        const res = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ itemId: item.id, imageBase64: png }),
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as {
            error?: string
          }
          setOcrError(err.error ?? `http_${res.status}`)
          return
        }
        const data = (await res.json()) as OcrResponse
        setOcrResult(data)
        // Phase 4 Path C (lock #8): 펜으로 답까지 표시했으면 자동으로
        // solve-store.selectedAnswer 채움. 5지선다 + Vision 감지 + 신뢰도 0.5+ 만.
        // 사용자가 chip 으로 명시 선택했으면 (selectedAnswer 이미 set) 덮어쓰지 않음.
        if (
          data.detectedAnswerChoice &&
          data.answerConfidence >= 0.5 &&
          item.itemChoices &&
          item.itemChoices.length >= data.detectedAnswerChoice
        ) {
          const choiceText =
            item.itemChoices[data.detectedAnswerChoice - 1]?.trim()
          if (choiceText) {
            const current = useSolveStore.getState().selectedAnswer
            if (!current) {
              useSolveStore.getState().setSelectedAnswer(choiceText)
            }
          }
        }
      } catch (e) {
        setOcrError((e as Error).message ?? "network_error")
      } finally {
        setOcrPending(false)
      }
    },
    [item.id, item.itemChoices],
  )

  const handlePencilClear = useCallback(() => {
    setPencilPng(null)
    setOcrResult(null)
    setOcrError(null)
  }, [])

  const handleOcrDismiss = useCallback(() => {
    setOcrResult(null)
  }, [])

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
        className="relative z-40 flex items-center justify-between gap-4 border-b border-black/8 bg-white/90 backdrop-blur px-6 py-3 shrink-0"
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
          {/* 모드 chip + dropdown (Phase 4 후속 — challenge/retry 진입점). */}
          <div className="relative" ref={modeMenuRef}>
            <button
              type="button"
              onClick={() => setModeMenuOpen((v) => !v)}
              aria-expanded={modeMenuOpen}
              aria-haspopup="menu"
              data-testid="mode-chip"
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                mode === "challenge"
                  ? "border-violet-300 bg-violet-50 text-violet-800"
                  : mode === "retry"
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : mode === "daily"
                      ? "border-sky-300 bg-sky-50 text-sky-800"
                      : mode === "exam"
                        ? "border-rose-300 bg-rose-50 text-rose-800"
                        : mode === "recovery"
                          ? "border-orange-300 bg-orange-50 text-orange-800"
                          : "border-black/10 bg-white text-black/70 hover:bg-black/[0.03]"
              }`}
            >
              {mode === "challenge" && <Target size={12} />}
              <span>
                {mode === "challenge"
                  ? challengeCtx?.patternLabel
                    ? `챌린지 · ${challengeCtx.patternLabel}`
                    : "챌린지"
                  : mode === "retry"
                    ? "재도전"
                    : mode === "daily"
                      ? "오늘의 도전"
                      : mode === "exam"
                        ? "실전 모드"
                        : mode === "recovery"
                          ? "오답복구"
                          : "연습"}
              </span>
              <ChevronDown
                size={11}
                className={`transition-transform ${modeMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
            {modeMenuOpen && (
              <div
                role="menu"
                data-testid="mode-menu"
                className="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-lg border border-black/10 bg-white shadow-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={enterPracticeMode}
                  className={`flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-black/[0.04] ${
                    mode === "practice" ? "bg-black/[0.03]" : ""
                  }`}
                  data-testid="mode-option-practice"
                >
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span className="flex-1">
                    <span className="block font-medium text-black/85">
                      연습 모드
                    </span>
                    <span className="block text-[10px] text-black/50">
                      힌트·AI 코치 사용 가능
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={enterChallengeMode}
                  disabled={item.patternIds.length === 0}
                  className={`flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 ${
                    mode === "challenge" ? "bg-violet-50/60" : ""
                  }`}
                  data-testid="mode-option-challenge"
                  title={
                    item.patternIds.length === 0
                      ? "이 문제에 연결된 유형 정보가 없어요"
                      : "현재 유형 5연속 정답에 도전"
                  }
                >
                  <Target size={11} className="mt-0.5 shrink-0 text-violet-500" />
                  <span className="flex-1">
                    <span className="block font-medium text-black/85">
                      챌린지 · {firstPatternLabel || "현재 유형"}
                    </span>
                    <span className="block text-[10px] text-black/50">
                      힌트·AI 잠금 · 5연속 정답 시 난이도 ↑
                    </span>
                  </span>
                </button>
                {mode === "retry" && retryCtx && (
                  <div
                    className="border-t border-black/5 bg-amber-50 px-3 py-2 text-[10px] text-amber-900"
                    data-testid="mode-retry-banner"
                  >
                    재도전 진행 중 · 리캡 {retryCtx.recapPatternIds.length}장
                    통과 후 같은 문제 재시도
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 약점 framing — 그래프 강등 표면 1. 클릭 → 우 패널 학습지도 swap (lock 2)
              weakCount=0 이면 캡슐 자체 hide. */}
          {weakCount > 0 && (
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
              약점 −{weakCount}개
              <span className="text-rose-400">›</span>
            </button>
          )}

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
        {/* LEFT — PDF chunks (E2E 수정: 좁아서 가독성 낮음 → 비율 ↑) */}
        <Panel defaultSize="28%" minSize="20%" maxSize="42%" id="left">
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

        {/* CENTER — Phase 1B: PDF (위 60%) + SolveClient (아래 40%). 좌 패널 ↑ 한 만큼 center ↓. */}
        <Panel defaultSize="44%" minSize="30%" id="center">
          <section
            className="flex h-full flex-col overflow-hidden bg-white/30"
            data-testid="workspace-hero"
          >
            {pdfSignedUrl ? (
              <>
                <div className="h-[60%] min-h-0 border-b border-black/8">
                  <PdfPenCanvas
                    itemId={item.id}
                    userId={userId}
                    signedUrl={pdfSignedUrl}
                    title={docTitle ?? "강의안"}
                    onExport={handlePencilExport}
                    onClearAttachment={handlePencilClear}
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
                    from={fromDaily || mode === "daily" ? "daily" : null}
                    batch={batch}
                    batchIdx={batchIdx}
                    challengeCtx={challengeCtx}
                    retryCtx={retryCtx}
                    embedded
                    injectedPencilPng={pencilPng}
                    injectedOcrResult={ocrResult}
                    injectedOcrPending={ocrPending}
                    injectedOcrError={ocrError}
                    onOcrDismiss={handleOcrDismiss}
                    onPencilClearFromResult={handlePencilClear}
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
                  challengeCtx={challengeCtx}
                  retryCtx={retryCtx}
                  embedded
                />
              </div>
            )}
          </section>
        </Panel>

        <Separator className="w-px bg-black/8 hover:w-1 hover:bg-emerald-400/40 transition-all" />

        {/* RIGHT — Coach ↔ 학습 지도 swap (lock 2). nuqs ?right=coach|graph */}
        <Panel defaultSize="28%" minSize="20%" maxSize="40%" id="right">
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
                <CoachPanel itemId={item.id} variant="inline" />
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
