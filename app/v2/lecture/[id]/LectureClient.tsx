"use client"

/**
 * LectureClient — 강의안 워크스페이스 셸 (북극성 Stage 2).
 * Spec: docs/north-star-spec-2026-05-11.md §4
 *
 * 3-pane:
 *   좌 22% — Chunks list (드래그 X, 매핑 상태 표시)
 *   중 50% — PDF viewer (workspace 와 동일 PdfPageViewer 재사용)
 *   우 28% — 커버리지 검수: coverage % + 미매핑 chunk drawer + 매핑 액션
 */

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Group, Panel, Separator } from "react-resizable-panels"
import { ChevronLeft } from "lucide-react"
import type { CoverageReport } from "@/lib/north-star/coverage"
import type { ChunkMapState } from "@/lib/db/schema"
import { CoverageBadge } from "./_components/CoverageBadge"
import { UnmappedDrawer } from "./_components/UnmappedDrawer"

const PdfPageViewer = dynamic(
  () =>
    import("@/app/v2/workspace/[itemId]/_components/PdfPageViewer").then(
      (m) => ({ default: m.PdfPageViewer }),
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-white text-xs text-black/45">
        PDF 뷰어 로딩 중…
      </div>
    ),
  },
)

export interface LectureChunk {
  id: string
  ordinal: number
  sectionTitle: string | null
  pageStart: number | null
  content: string
}

export interface LectureMapping {
  chunkId: string
  nodeId: string
  state: ChunkMapState
  confidence: number
  proposedBy: "llm" | "user"
}

export interface LectureClientProps {
  lectureId: string
  lectureTitle: string
  lectureStatus: "in_progress" | "completed"
  pdfSignedUrl: string | null
  docTitle: string | null
  chunks: LectureChunk[]
  mappings: LectureMapping[]
  coverage: CoverageReport
}

export function LectureClient({
  lectureId,
  lectureTitle,
  lectureStatus,
  pdfSignedUrl,
  docTitle,
  chunks,
  mappings,
  coverage,
}: LectureClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  // chunkId → state (가장 강한 상태 우선: confirmed > proposed > rejected)
  const chunkState = useMemo(() => {
    const map = new Map<string, ChunkMapState>()
    const rank: Record<ChunkMapState, number> = {
      rejected: 0,
      proposed: 1,
      confirmed: 2,
    }
    for (const m of mappings) {
      const prev = map.get(m.chunkId)
      if (!prev || rank[m.state] > rank[prev]) {
        map.set(m.chunkId, m.state)
      }
    }
    return map
  }, [mappings])

  const unmappedChunks = useMemo(
    () =>
      chunks.filter(
        (c) =>
          !chunkState.get(c.id) || chunkState.get(c.id) === "rejected",
      ),
    [chunks, chunkState],
  )

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-zinc-50">
      <header
        className="flex items-center justify-between gap-4 border-b border-black/8 bg-white/90 backdrop-blur px-6 py-3 shrink-0"
        data-testid="lecture-header"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/v2/home"
            className="text-black/45 hover:text-black/85 shrink-0"
            aria-label="홈"
          >
            <ChevronLeft size={16} />
          </Link>
          <Link
            href="/v2/home"
            className="font-extrabold tracking-[0.18em] text-xs text-black/85 shrink-0"
          >
            DEEPEN<span className="opacity-40">.LECTURE</span>
          </Link>
          <span className="text-black/20 shrink-0">/</span>
          <nav className="flex items-center gap-1 text-xs text-black/60 min-w-0">
            <span className="truncate">{docTitle ?? lectureTitle}</span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <CoverageBadge
            report={coverage}
            onClick={() => setDrawerOpen((v) => !v)}
            active={drawerOpen}
          />
          {lectureStatus === "completed" && (
            <span
              className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-900"
              data-testid="lecture-completed-badge"
            >
              완주
            </span>
          )}
        </div>
      </header>

      <Group orientation="horizontal" className="flex-1">
        {/* LEFT — Chunks list */}
        <Panel defaultSize="22%" minSize="15%" maxSize="35%" id="left">
          <aside className="flex h-full flex-col border-r border-black/8 bg-white/60">
            <div className="flex items-center justify-between border-b border-black/5 px-4 py-3 shrink-0">
              <div className="text-[10px] uppercase tracking-widest text-black/45">
                📄 {chunks.length} chunks
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {chunks.length === 0 ? (
                <div className="text-xs text-black/45 px-2 py-4">
                  chunks 가 아직 추출되지 않았어요.
                </div>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {chunks.map((c) => {
                    const state = chunkState.get(c.id)
                    const tone =
                      state === "confirmed"
                        ? "border-emerald-200 bg-emerald-50/60"
                        : state === "proposed"
                          ? "border-amber-200 bg-amber-50/60"
                          : "border-black/8 bg-white"
                    return (
                      <li
                        key={c.id}
                        data-testid={`lecture-chunk-${c.ordinal}`}
                        className={`rounded-md border px-2.5 py-1.5 text-[11px] ${tone}`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-black/45 mb-0.5">
                          <span className="font-mono">#{c.ordinal}</span>
                          {state && (
                            <span
                              className={`px-1 rounded ${
                                state === "confirmed"
                                  ? "text-emerald-800"
                                  : state === "proposed"
                                    ? "text-amber-800"
                                    : "text-black/40"
                              }`}
                            >
                              {state === "confirmed"
                                ? "✓ 매핑"
                                : state === "proposed"
                                  ? "? 제안"
                                  : "× 거부"}
                            </span>
                          )}
                        </div>
                        <div className="text-black/75 line-clamp-2 leading-snug">
                          {c.content}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </aside>
        </Panel>

        <Separator className="w-px bg-black/8 hover:w-1 hover:bg-emerald-400/40 transition-all" />

        {/* CENTER — PDF viewer */}
        <Panel defaultSize="50%" minSize="35%" id="center">
          <section className="h-full overflow-hidden bg-white/30">
            {pdfSignedUrl ? (
              <PdfPageViewer
                signedUrl={pdfSignedUrl}
                title={docTitle ?? "강의안"}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-black/45">
                PDF 가 아직 업로드되지 않았어요.
              </div>
            )}
          </section>
        </Panel>

        <Separator className="w-px bg-black/8 hover:w-1 hover:bg-emerald-400/40 transition-all" />

        {/* RIGHT — 커버리지 검수 */}
        <Panel defaultSize="28%" minSize="20%" maxSize="45%" id="right">
          <aside className="flex h-full flex-col border-l border-black/8 bg-white/85">
            <UnmappedDrawer
              lectureId={lectureId}
              unmappedChunks={unmappedChunks}
              totalChunks={coverage.totalChunks}
              mappedChunks={coverage.mappedChunks}
              coveragePct={coverage.coveragePct}
            />
          </aside>
        </Panel>
      </Group>
    </main>
  )
}
