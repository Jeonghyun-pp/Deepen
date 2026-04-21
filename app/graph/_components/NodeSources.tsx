"use client"

import { useEffect, useState } from "react"

interface Source {
  id: string
  content: string
  contentType: "text" | "equation_placeholder" | "figure_placeholder"
  pageStart: number | null
  pageEnd: number | null
  ordinal: number
  documentId: string
  documentTitle: string
}

export default function NodeSources({ nodeId }: { nodeId: string }) {
  const [sources, setSources] = useState<Source[]>([])
  const [state, setState] = useState<"loading" | "ready" | "error" | "empty">(
    "loading"
  )

  useEffect(() => {
    let cancelled = false
    setState("loading")
    ;(async () => {
      try {
        const res = await fetch(`/api/nodes/${nodeId}/sources`, {
          credentials: "include",
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as { sources: Source[] }
        if (cancelled) return
        if (data.sources.length === 0) setState("empty")
        else {
          setSources(data.sources)
          setState("ready")
        }
      } catch {
        if (!cancelled) setState("error")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [nodeId])

  if (state === "loading") {
    return (
      <div className="px-4 py-3 border-b border-white/10">
        <h4 className="text-xs font-bold mb-2 text-white/50">출처</h4>
        <p className="text-xs text-white/50">불러오는 중...</p>
      </div>
    )
  }

  if (state === "empty") {
    return (
      <div className="px-4 py-3 border-b border-white/10">
        <h4 className="text-xs font-bold mb-2 text-white/50">출처</h4>
        <p className="text-xs text-white/50">
          수동으로 추가된 노드 — 연결된 출처 chunk 없음
        </p>
      </div>
    )
  }

  if (state === "error") return null

  // 문서별 그룹핑
  const byDoc = new Map<string, { title: string; items: Source[] }>()
  for (const s of sources) {
    if (!byDoc.has(s.documentId)) {
      byDoc.set(s.documentId, { title: s.documentTitle, items: [] })
    }
    byDoc.get(s.documentId)!.items.push(s)
  }

  return (
    <div className="px-4 py-3 border-b border-white/10 space-y-3">
      <h4 className="text-xs font-bold text-white/50">
        출처 ({sources.length})
      </h4>
      {[...byDoc.values()].map((group) => (
        <div key={group.title} className="space-y-1.5">
          <p className="text-[11px] font-semibold text-white/75 truncate">
            {group.title}
          </p>
          <ul className="space-y-1">
            {group.items.map((s) => (
              <li
                key={s.id}
                className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5"
              >
                <div className="flex items-center gap-1.5 text-[10px] text-white/50 mb-0.5">
                  {s.pageStart != null && (
                    <span>
                      p.{s.pageStart}
                      {s.pageEnd != null && s.pageEnd !== s.pageStart
                        ? `–${s.pageEnd}`
                        : ""}
                    </span>
                  )}
                  {s.contentType !== "text" && (
                    <span className="rounded bg-yellow-400/15 text-yellow-300 px-1">
                      {s.contentType === "equation_placeholder"
                        ? "수식 미지원"
                        : "figure 미지원"}
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed text-white/90 line-clamp-3">
                  {s.content}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
