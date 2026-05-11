"use client"

/**
 * UnmappedDrawer — 미매핑 chunk 리스트 + 액션 3개.
 * Spec: docs/north-star-spec-2026-05-11.md §4.2 핵심 surface 2.
 *
 * 각 행 액션:
 *   - 노드로 승급 (POST /api/lecture/[id]/chunks/[chunkId]/promote)
 *   - Deepen 해설로 표시 (POST .../confirm-as-commentary)
 *   - 무시 (POST .../reject)
 *
 * 모든 액션은 즉시 router.refresh() 로 server 재 fetch + 커버리지 재계산.
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { LectureChunk } from "../LectureClient"

export interface UnmappedDrawerProps {
  lectureId: string
  unmappedChunks: LectureChunk[]
  totalChunks: number
  mappedChunks: number
  coveragePct: number
}

export function UnmappedDrawer({
  lectureId,
  unmappedChunks,
  totalChunks,
  mappedChunks,
  coveragePct,
}: UnmappedDrawerProps) {
  const router = useRouter()
  const [busyChunkId, setBusyChunkId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const callAction = async (
    chunkId: string,
    action: "promote" | "reject" | "commentary",
  ) => {
    if (busyChunkId) return
    setBusyChunkId(chunkId)
    setError(null)
    try {
      const res = await fetch(
        `/api/lecture/${lectureId}/chunks/${chunkId}/${action}`,
        { method: "POST", credentials: "include" },
      )
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setError(j.error ?? `http_${res.status}`)
        return
      }
      startTransition(() => router.refresh())
    } catch (e) {
      setError((e as Error).message ?? "network_error")
    } finally {
      setBusyChunkId(null)
    }
  }

  const complete = totalChunks > 0 && unmappedChunks.length === 0

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-black/5 px-4 py-3 shrink-0">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-black/45">
            커버리지 검수
          </div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-black/85">
              {coveragePct.toFixed(0)}%
            </span>
            <span className="text-[11px] text-black/55">
              {mappedChunks}/{totalChunks}
            </span>
          </div>
        </div>
        {complete && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
            완결
          </span>
        )}
      </header>

      {error && (
        <div
          className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-900"
          role="alert"
        >
          처리 실패: {error}
        </div>
      )}

      {complete ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-xs text-black/55">
          모든 chunk 가 노드로 매핑됐어요.
          <br />
          이해 확인 루프로 진입할 수 있습니다.
        </div>
      ) : (
        <ul
          className="flex-1 overflow-y-auto divide-y divide-black/5"
          data-testid="unmapped-list"
        >
          {unmappedChunks.map((c) => (
            <li
              key={c.id}
              data-testid={`unmapped-chunk-${c.ordinal}`}
              className="px-4 py-3"
            >
              <div className="flex items-center gap-2 text-[10px] text-black/45 mb-1">
                <span className="font-mono">#{c.ordinal}</span>
                {c.pageStart !== null && <span>p.{c.pageStart}</span>}
                {c.sectionTitle && (
                  <span className="truncate text-black/55">
                    · {c.sectionTitle}
                  </span>
                )}
              </div>
              <p className="text-xs text-black/80 leading-snug line-clamp-3 mb-2">
                {c.content}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={busyChunkId !== null}
                  onClick={() => callAction(c.id, "promote")}
                  data-testid={`promote-${c.ordinal}`}
                  className="rounded-md border border-emerald-300 bg-white px-2 py-1 text-[10px] font-medium text-emerald-900 hover:bg-emerald-50 disabled:opacity-40"
                >
                  노드로 승급
                </button>
                <button
                  type="button"
                  disabled={busyChunkId !== null}
                  onClick={() => callAction(c.id, "commentary")}
                  data-testid={`commentary-${c.ordinal}`}
                  className="rounded-md border border-violet-300 bg-white px-2 py-1 text-[10px] font-medium text-violet-900 hover:bg-violet-50 disabled:opacity-40"
                  title="Deepen 해설로 표시 (커버리지 카운트)"
                >
                  해설로 표시
                </button>
                <button
                  type="button"
                  disabled={busyChunkId !== null}
                  onClick={() => callAction(c.id, "reject")}
                  data-testid={`reject-${c.ordinal}`}
                  className="rounded-md border border-black/15 bg-white px-2 py-1 text-[10px] font-medium text-black/65 hover:bg-black/[0.03] disabled:opacity-40"
                >
                  무시
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <footer className="border-t border-black/5 bg-zinc-50 px-4 py-2 text-[10px] text-black/45 shrink-0">
        LLM 제안 신뢰도 ≥0.7 자동 매핑. 미매핑은 직접 검수.
      </footer>
    </div>
  )
}
