"use client"

/**
 * WeeklyComparisonChart — 최근 4주 막대 + 마스터리 라인 (custom SVG).
 * Spec: 09-q3-build.md M3.5. recharts 미사용 (의존성 X).
 *
 * 트레이드오프: 정밀 차트가 아니라 retention 카피 보조 수단. 4주 < 12주.
 */
import { useState } from "react"
import type { StatsOverviewResponse } from "@/lib/api/schemas/stats"

interface Props {
  weeks: StatsOverviewResponse["weeklyComparison"]
}

const W = 600
const H = 220
const PADDING = { top: 24, right: 16, bottom: 32, left: 36 }

export function WeeklyComparisonChart({ weeks }: Props) {
  const [highlight, setHighlight] = useState<"attempts" | "mastery">("attempts")

  const innerW = W - PADDING.left - PADDING.right
  const innerH = H - PADDING.top - PADDING.bottom

  const maxAttempts = Math.max(1, ...weeks.map((w) => w.attempts))
  const barW = innerW / Math.max(1, weeks.length) - 12

  return (
    <div
      className="rounded-xl border border-black/10 bg-white p-5"
      data-testid="weekly-comparison"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-black/80">
          주간 비교 (최근 4주)
        </h2>
        <div className="flex gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => setHighlight("attempts")}
            className={`rounded-full px-2.5 py-1 ${highlight === "attempts" ? "bg-black text-white" : "bg-black/[0.05] text-black/65 hover:bg-black/[0.08]"}`}
          >
            푼 문제
          </button>
          <button
            type="button"
            onClick={() => setHighlight("mastery")}
            className={`rounded-full px-2.5 py-1 ${highlight === "mastery" ? "bg-black text-white" : "bg-black/[0.05] text-black/65 hover:bg-black/[0.08]"}`}
          >
            마스터리
          </button>
        </div>
      </header>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className="mt-3"
        role="img"
        aria-label="최근 4주 학습 추이"
      >
        {/* y axis (단순 4 ticks) */}
        {[0, 1, 2, 3].map((i) => {
          const y = PADDING.top + (innerH * i) / 3
          return (
            <line
              key={i}
              x1={PADDING.left}
              x2={W - PADDING.right}
              y1={y}
              y2={y}
              stroke="#e5e7eb"
              strokeDasharray={i === 3 ? "" : "2 3"}
            />
          )
        })}

        {weeks.map((w, idx) => {
          const x =
            PADDING.left + (innerW * (idx + 0.5)) / weeks.length - barW / 2
          const attemptsH = (w.attempts / maxAttempts) * innerH
          const masteryY = PADDING.top + (1 - w.avgMastery) * innerH
          const isAttempts = highlight === "attempts"
          return (
            <g key={w.weekEnding} data-testid={`week-${idx}`}>
              <rect
                x={x}
                y={PADDING.top + innerH - attemptsH}
                width={barW}
                height={attemptsH}
                rx={2}
                fill={isAttempts ? "#15803d" : "#d1fae5"}
                opacity={isAttempts ? 0.85 : 0.6}
              />
              {/* mastery dot */}
              <circle
                cx={x + barW / 2}
                cy={masteryY}
                r={isAttempts ? 3 : 5}
                fill={!isAttempts ? "#1f2937" : "#94a3b8"}
              />
              <text
                x={x + barW / 2}
                y={H - 12}
                textAnchor="middle"
                fontSize="10"
                fill="#475569"
              >
                {w.weekEnding.slice(5)}
              </text>
              <text
                x={x + barW / 2}
                y={
                  isAttempts
                    ? PADDING.top + innerH - attemptsH - 6
                    : masteryY - 8
                }
                textAnchor="middle"
                fontSize="10"
                fill="#0f172a"
                fontWeight={600}
              >
                {isAttempts ? w.attempts : `${(w.avgMastery * 100).toFixed(0)}%`}
              </text>
            </g>
          )
        })}

        {/* mastery line connecting dots */}
        {weeks.length > 1 && (
          <polyline
            fill="none"
            stroke={highlight === "mastery" ? "#1f2937" : "transparent"}
            strokeWidth={1.5}
            points={weeks
              .map((w, idx) => {
                const x =
                  PADDING.left +
                  (innerW * (idx + 0.5)) / weeks.length
                const y = PADDING.top + (1 - w.avgMastery) * innerH
                return `${x},${y}`
              })
              .join(" ")}
          />
        )}
      </svg>

      <p className="mt-2 text-[11px] text-black/45">
        막대 = 푼 문제 / 점 = 평균 마스터리. 가장 오른쪽이 이번 주.
      </p>
    </div>
  )
}
