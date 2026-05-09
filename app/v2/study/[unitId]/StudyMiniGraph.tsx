"use client"

/**
 * 단원 미니 그래프 — Q1 단순 stub.
 *
 * 풀이 화면 GraphPanel 과 같은 데이터 (/api/graph/unit/default) 를 가져와
 * Pattern 노드만 grid 형태로 표시. 풀이 화면에서 더 자세한 시각화.
 *
 * Q2 polish: force-directed 레이아웃 + Pattern↔Pattern prereq 라인 + click
 * 시 단원 컨텍스트 전환.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import type { GraphUnitResponse } from "@/lib/api/schemas/graph"

const VIEWBOX = 300
const RADIUS = 9

export function StudyMiniGraph() {
  const [data, setData] = useState<GraphUnitResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/graph/unit/default`, {
          credentials: "include",
        })
        if (!res.ok) {
          if (!cancelled) setError(String(res.status))
          return
        }
        const json = (await res.json()) as GraphUnitResponse
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? "fetch_error")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <p className="flex h-full items-center justify-center text-xs text-rose-700">
        지도를 불러오지 못했어요.
      </p>
    )
  }
  if (!data) {
    return (
      <p className="flex h-full items-center justify-center text-xs text-black/45">
        지도 로딩…
      </p>
    )
  }

  const patterns = data.nodes.filter((n) => n.type === "pattern")
  if (patterns.length === 0) {
    return (
      <p className="flex h-full items-center justify-center text-xs text-black/45">
        Pattern 데이터 없음.
      </p>
    )
  }

  // 단순 그리드 — sqrt(N)x ceil(N/sqrt(N))
  const cols = Math.ceil(Math.sqrt(patterns.length))
  const rows = Math.ceil(patterns.length / cols)
  const cellW = VIEWBOX / (cols + 1)
  const cellH = VIEWBOX / (rows + 1)

  return (
    <div className="flex h-full flex-col gap-1">
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="flex-1"
        role="img"
        aria-label="단원 학습 지도 미리보기"
      >
        {patterns.map((p, idx) => {
          const c = idx % cols
          const r = Math.floor(idx / cols)
          const x = cellW * (c + 1)
          const y = cellH * (r + 1)
          const a = p.visualAttrs
          return (
            <g key={p.id}>
              <circle
                cx={x}
                cy={y}
                r={RADIUS}
                fill={a.fillColor}
                stroke={a.borderColor ?? a.strokeColor}
                strokeWidth={a.borderColor ? 2 : 1.2}
                strokeDasharray={a.strokeStyle === "dashed" ? "3 2" : undefined}
                opacity={a.opacity}
              />
            </g>
          )
        })}
      </svg>
      <Link
        href="/v2/graph"
        className="self-end text-[11px] text-black/45 hover:text-black/80 hover:underline"
      >
        전체 지도 →
      </Link>
    </div>
  )
}
