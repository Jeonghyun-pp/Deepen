"use client"

/**
 * 그래프 미니 뷰 — 풀이 화면 우상단.
 * Spec: docs/build-spec/07-q1-build.md M1.6, deck Slide 8 노드 5종 상태.
 *
 * Q1 범위:
 *   - 단순 SVG 레이아웃 (3 layer): 직접 prereq → 현재 Pattern → 현재 Item.
 *   - 서버에서 인코딩한 visualAttrs 그대로 적용.
 *   - 코치 highlightNodeIds 는 펄스 ring.
 *   - 클릭 noop (M2.5+ 컨텍스트 전환).
 *
 * fetch: 마운트 시 /api/graph/unit/[unitKey] 1회. unitKey 가 없으면
 *        'default' 사용 (Q1 단일 단원).
 */

import { useEffect, useMemo, useState } from "react"
import type {
  GraphEdgeDto,
  GraphNodeDto,
  GraphUnitResponse,
} from "@/lib/api/schemas/graph"

const VIEWBOX = 280
const RADIUS = 10
const HIGHLIGHT_RING = 5

export interface GraphPanelProps {
  itemId: string
  unitKey?: string
  highlightNodeIds: string[]
}

interface Positioned {
  node: GraphNodeDto
  x: number
  y: number
}

function computeLayout(args: {
  itemId: string
  nodes: GraphNodeDto[]
  edges: GraphEdgeDto[]
}): { positioned: Positioned[]; lines: { from: Positioned; to: Positioned }[] } {
  const { itemId, nodes, edges } = args

  const byId = new Map(nodes.map((n) => [n.id, n]))
  const item = byId.get(itemId)
  if (!item) return { positioned: [], lines: [] }

  // 현재 Item 의 Pattern 들 (Pattern--contains-->Item)
  const itemPatternIds = edges
    .filter((e) => e.type === "contains" && e.target === itemId)
    .map((e) => e.source)

  // 그 Pattern 들의 직접 prereq Pattern 들
  const prereqIds = edges
    .filter(
      (e) => e.type === "prerequisite" && itemPatternIds.includes(e.target),
    )
    .map((e) => e.source)

  const layers: { ids: string[] }[] = [
    { ids: [...new Set(prereqIds)] },
    { ids: [...new Set(itemPatternIds)] },
    { ids: [itemId] },
  ]

  const positioned: Positioned[] = []
  const ySpacing = VIEWBOX / (layers.length + 1)
  layers.forEach((layer, layerIdx) => {
    const y = ySpacing * (layerIdx + 1)
    if (layer.ids.length === 0) return
    const xSpacing = VIEWBOX / (layer.ids.length + 1)
    layer.ids.forEach((id, idx) => {
      const node = byId.get(id)
      if (!node) return
      positioned.push({
        node,
        x: xSpacing * (idx + 1),
        y,
      })
    })
  })

  const positionMap = new Map(positioned.map((p) => [p.node.id, p]))
  const lines: { from: Positioned; to: Positioned }[] = []
  for (const e of edges) {
    const a = positionMap.get(e.source)
    const b = positionMap.get(e.target)
    if (a && b && (e.type === "prerequisite" || e.type === "contains")) {
      lines.push({ from: a, to: b })
    }
  }

  return { positioned, lines }
}

export function GraphPanel({
  itemId,
  unitKey = "default",
  highlightNodeIds,
}: GraphPanelProps) {
  const [data, setData] = useState<GraphUnitResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(
          `/api/graph/unit/${encodeURIComponent(unitKey)}`,
          { credentials: "include" },
        )
        if (!res.ok) {
          if (!cancelled) setError(`http_${res.status}`)
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
  }, [unitKey])

  const layout = useMemo(() => {
    if (!data) return null
    return computeLayout({
      itemId,
      nodes: data.nodes,
      edges: data.edges,
    })
  }, [data, itemId])

  const highlightSet = useMemo(
    () => new Set(highlightNodeIds),
    [highlightNodeIds],
  )

  return (
    <div
      className="rounded-lg border border-black/5 bg-white/60 p-2"
      data-testid="graph-panel"
    >
      <p className="mb-1 text-[10px] uppercase tracking-widest text-black/45">
        학습 지도
      </p>
      <div className="aspect-square w-full">
        {error && (
          <p className="p-2 text-xs text-rose-700" role="alert">
            지도를 불러오지 못했어요.
          </p>
        )}
        {!error && !layout && (
          <p className="flex h-full items-center justify-center text-xs text-black/45">
            로딩…
          </p>
        )}
        {layout && layout.positioned.length === 0 && (
          <p className="flex h-full items-center justify-center text-xs text-black/45">
            아직 그래프 데이터가 없어요.
          </p>
        )}
        {layout && layout.positioned.length > 0 && (
          <svg
            viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
            className="h-full w-full"
            role="img"
            aria-label="현재 학습 지도"
          >
            {layout.lines.map((l, i) => (
              <line
                key={i}
                x1={l.from.x}
                y1={l.from.y}
                x2={l.to.x}
                y2={l.to.y}
                stroke="#D4D4D8"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
            ))}
            {layout.positioned.map((p) => {
              const isHighlighted = highlightSet.has(p.node.id)
              const isCenter = p.node.id === itemId
              const a = p.node.visualAttrs
              const dashed = a.strokeStyle === "dashed"
              return (
                <g key={p.node.id} data-testid={`graph-node-${p.node.id}`}>
                  {isHighlighted && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={RADIUS + HIGHLIGHT_RING}
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      opacity={0.7}
                    >
                      <animate
                        attributeName="r"
                        values={`${RADIUS + HIGHLIGHT_RING - 2};${RADIUS + HIGHLIGHT_RING + 2};${RADIUS + HIGHLIGHT_RING - 2}`}
                        dur="1.4s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.3;0.8;0.3"
                        dur="1.4s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isCenter ? RADIUS + 2 : RADIUS}
                    fill={a.fillColor}
                    stroke={a.borderColor ?? a.strokeColor}
                    strokeWidth={a.borderColor ? 2 : 1.5}
                    strokeDasharray={dashed ? "3 2" : undefined}
                    opacity={a.opacity}
                  />
                  {a.badgeIcon === "warning" && (
                    <text
                      x={p.x + RADIUS - 1}
                      y={p.y - RADIUS + 3}
                      fontSize={9}
                      fill="#92400E"
                      textAnchor="middle"
                    >
                      ⚠
                    </text>
                  )}
                  <text
                    x={p.x}
                    y={p.y + RADIUS + 11}
                    fontSize={9}
                    fill="#525252"
                    textAnchor="middle"
                  >
                    {truncate(p.node.label, 10)}
                  </text>
                </g>
              )
            })}
          </svg>
        )}
      </div>
    </div>
  )
}

const truncate = (s: string, n: number): string =>
  s.length <= n ? s : `${s.slice(0, n)}…`
