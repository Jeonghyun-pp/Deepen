"use client"

/**
 * NotebookClient — 오답노트 list + filter rail + 우측 preview.
 * Stage 9 서버 page.tsx 가 entries 전달. client 는 필터링·검색·선택만.
 *
 * cause 분류:
 *   - all          전체
 *   - wrong        오답 (label='wrong')
 *   - unsure       헷갈림 (label='unsure')
 *   - repeat       재오답 (seen_count ≥ 2 + label='wrong')
 *   - 그 외 reasonTag 별 (concept_lack, pattern_misrecognition, …)
 *
 * 메모리 feedback (내부 분류 체계 노출 금지) — raw enum 키는 라벨로 매핑.
 */

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Filter,
  Search,
  Calendar,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  BookOpen,
  Sparkles,
} from "lucide-react"
import {
  PageShell,
  Card,
  PrimaryButton,
} from "../_components/ui"
import { LobbyHeader } from "../_components/LobbyHeader"
import {
  REASON_TAG_LABEL,
  REASON_TAG_TONE,
} from "../solve/_components/reason-tag-labels"
import type { ReasonTag } from "@/lib/db/schema"
import type { NotebookEntry } from "./page"

type CauseFilter = "all" | "wrong" | "unsure" | "repeat" | ReasonTag

interface CauseDef {
  id: CauseFilter
  label: string
  tone?: "amber" | "rose" | "violet" | "info"
}

const BASE_CAUSES: CauseDef[] = [
  { id: "all", label: "전체" },
  { id: "wrong", label: "오답", tone: "rose" },
  { id: "unsure", label: "헷갈림", tone: "amber" },
  { id: "repeat", label: "재오답", tone: "rose" },
]

const REASON_TAG_ORDER: ReasonTag[] = [
  "prereq_deficit",
  "concept_lack",
  "pattern_misrecognition",
  "approach_error",
  "calculation_error",
  "condition_misread",
  "graph_misread",
  "logic_leap",
  "time_overrun",
  "hint_dependent",
]

function reasonTone(t: ReasonTag): CauseDef["tone"] {
  const x = REASON_TAG_TONE[t]
  if (x === "alert") return "rose"
  if (x === "warning") return "amber"
  return "info"
}

function entryMatches(entry: NotebookEntry, filter: CauseFilter): boolean {
  if (filter === "all") return true
  if (filter === "wrong") return entry.label === "wrong"
  if (filter === "unsure") return entry.label === "unsure"
  if (filter === "repeat") return entry.seenCount >= 2 && entry.label === "wrong"
  // reasonTag id
  return entry.reasonTags.includes(filter)
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })
}

export interface NotebookClientProps {
  entries: NotebookEntry[]
  /** Stage 11 — recovery redirect 또는 외부 진입에서 초기 cause filter 지정. */
  initialCause?: string
}

const VALID_CAUSE_FILTERS = new Set<string>([
  "all",
  "wrong",
  "unsure",
  "repeat",
  "prereq_deficit",
  "concept_lack",
  "pattern_misrecognition",
  "approach_error",
  "calculation_error",
  "condition_misread",
  "graph_misread",
  "logic_leap",
  "time_overrun",
  "hint_dependent",
])

export function NotebookClient({
  entries,
  initialCause,
}: NotebookClientProps) {
  const safeInitial: CauseFilter =
    initialCause && VALID_CAUSE_FILTERS.has(initialCause)
      ? (initialCause as CauseFilter)
      : "all"
  const [filter, setFilter] = useState<CauseFilter>(safeInitial)
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(
    entries[0]?.itemId ?? null,
  )

  // Stage 11: "오답복구 시작" 첫 wrong entry → workspace 직행.
  const firstWrongId =
    entries.find((e) => e.label === "wrong")?.itemId ??
    entries[0]?.itemId ??
    null

  // 각 cause 별 count 계산
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: entries.length }
    let wrong = 0
    let unsure = 0
    let repeat = 0
    const reasonCounts: Partial<Record<ReasonTag, number>> = {}
    for (const e of entries) {
      if (e.label === "wrong") wrong++
      if (e.label === "unsure") unsure++
      if (e.seenCount >= 2 && e.label === "wrong") repeat++
      for (const t of e.reasonTags) {
        reasonCounts[t] = (reasonCounts[t] ?? 0) + 1
      }
    }
    c.wrong = wrong
    c.unsure = unsure
    c.repeat = repeat
    for (const k of Object.keys(reasonCounts) as ReasonTag[]) {
      c[k] = reasonCounts[k] ?? 0
    }
    return c
  }, [entries])

  // reasonTag 중 count > 0 만 surface
  const activeReasonTags = REASON_TAG_ORDER.filter((t) => (counts[t] ?? 0) > 0)
  const causes: CauseDef[] = [
    ...BASE_CAUSES,
    ...activeReasonTags.map((t) => ({
      id: t as CauseFilter,
      label: REASON_TAG_LABEL[t],
      tone: reasonTone(t),
    })),
  ]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((e) => {
      if (!entryMatches(e, filter)) return false
      if (!q) return true
      const hay = `${e.itemLabel} ${e.itemSource ?? ""} ${e.itemNumber ?? ""}`.toLowerCase()
      return hay.includes(q)
    })
  }, [entries, filter, query])

  const selected = filtered.find((e) => e.itemId === selectedId) ?? filtered[0]

  if (entries.length === 0) {
    return (
      <PageShell>
        <LobbyHeader
          active="notebook"
          rightSlot={
            <Link
              href="/v2/home"
              className="inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white"
            >
              풀이 시작
            </Link>
          }
        />
        <main className="max-w-3xl mx-auto px-6 py-12 text-center">
          <h1 className="text-xl font-semibold text-black/85">아직 오답이 없어요</h1>
          <p className="mt-2 text-sm text-black/55">
            문제를 풀면 오답·헷갈림이 자동으로 여기에 쌓입니다.
          </p>
        </main>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <LobbyHeader
        active="notebook"
        rightSlot={
          firstWrongId ? (
            <Link
              href={`/v2/workspace/${firstWrongId}?mode=recovery&from=notebook`}
              data-testid="enter-recovery"
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition"
            >
              <RefreshCw size={11} />
              오답복구 시작
            </Link>
          ) : null
        }
      />

      <main className="max-w-[1400px] mx-auto h-[calc(100vh-72px)] flex">
        {/* Left: filter rail */}
        <aside className="w-60 border-r border-black/5 px-4 py-5 overflow-y-auto">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-black/45 mb-3 px-2">
            <Filter size={10} /> 원인별
          </div>
          <div className="space-y-0.5">
            {causes.map((c) => {
              const count = counts[c.id] ?? 0
              return (
                <button
                  key={c.id}
                  onClick={() => setFilter(c.id)}
                  data-testid={`cause-${c.id}`}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition ${
                    filter === c.id
                      ? "bg-black/[0.05] text-[#1A1A2E] font-semibold"
                      : "text-black/60 hover:bg-black/[0.02] hover:text-black/85"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {c.tone && (
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background:
                            c.tone === "amber"
                              ? "#CA8A04"
                              : c.tone === "rose"
                                ? "#E11D48"
                                : c.tone === "violet"
                                  ? "#7C3AED"
                                  : "#94A3B8",
                        }}
                      />
                    )}
                    {c.label}
                  </span>
                  <span className="text-[10px] text-black/40 font-mono">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </aside>

        {/* Center: list */}
        <section className="flex-1 border-r border-black/5 overflow-y-auto">
          <div className="px-6 py-4 border-b border-black/5 bg-white sticky top-0 z-10">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-lg font-bold tracking-tight">
                  {causes.find((c) => c.id === filter)?.label}
                </h1>
                <div className="text-xs text-black/50 mt-0.5">
                  {filtered.length}개 항목 · 최근부터
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-md border border-black/8 bg-white px-2.5 py-1.5">
                  <Search size={11} className="opacity-40" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="검색"
                    className="text-xs bg-transparent outline-none placeholder:text-black/30 w-32"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 space-y-2">
            {filtered.length === 0 && (
              <div className="text-center text-xs text-black/45 py-8">
                해당 분류 항목이 없어요.
              </div>
            )}
            {filtered.map((e) => {
              const isRepeat = e.seenCount >= 2 && e.label === "wrong"
              const examLabel =
                e.itemSource && e.itemNumber !== null
                  ? `${e.itemSource} ${e.itemNumber}번`
                  : (e.itemSource ?? e.itemLabel.slice(0, 30))
              return (
                <button
                  key={e.itemId}
                  onClick={() => setSelectedId(e.itemId)}
                  className={`w-full text-left rounded-lg border px-4 py-3 transition ${
                    selected?.itemId === e.itemId
                      ? "border-[#15803D]/30 bg-[#F0FDF4] shadow-[0_2px_8px_rgba(21,128,61,0.06)]"
                      : "border-black/8 bg-white hover:border-black/15 hover:shadow-[0_2px_6px_rgba(0,0,0,0.04)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <ResultDot label={e.label} repeat={isRepeat} />
                      <span className="text-sm font-semibold truncate">
                        {examLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-black/40 shrink-0">
                      <Calendar size={10} />
                      {formatDate(e.lastSolvedAt)}
                    </div>
                  </div>
                  <div className="text-[12px] text-black/60 leading-snug mb-2 break-keep line-clamp-2">
                    {e.itemLabel.length > 80
                      ? `${e.itemLabel.slice(0, 80)}…`
                      : e.itemLabel}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {isRepeat && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 font-medium">
                        재오답 ({e.seenCount}회)
                      </span>
                    )}
                    {e.reasonTags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-black/[0.04] text-black/55 border border-black/5"
                      >
                        {REASON_TAG_LABEL[t]}
                      </span>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Right: preview */}
        <section className="w-[400px] overflow-y-auto bg-[#FAFAF8]">
          {selected && <Preview entry={selected} />}
        </section>
      </main>
    </PageShell>
  )
}

function ResultDot({
  label,
  repeat,
}: {
  label: "wrong" | "unsure"
  repeat: boolean
}) {
  if (repeat) return <RefreshCw size={13} style={{ color: "#E11D48" }} />
  if (label === "wrong") return <XCircle size={13} style={{ color: "#E11D48" }} />
  return <AlertCircle size={13} style={{ color: "#CA8A04" }} />
}

function Preview({ entry }: { entry: NotebookEntry }) {
  const examLabel =
    entry.itemSource && entry.itemNumber !== null
      ? `${entry.itemSource} ${entry.itemNumber}번`
      : (entry.itemSource ?? "문제")
  return (
    <div className="p-6 space-y-5">
      <header>
        <div className="text-[10px] uppercase tracking-widest text-black/45 mb-2">
          {entry.label === "wrong" ? "오답" : "헷갈림"}
          {entry.seenCount >= 2 && entry.label === "wrong" ? ` · ${entry.seenCount}회 재오답` : ""}
        </div>
        <h2 className="text-xl font-bold tracking-tight">{examLabel}</h2>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-black/55">
          <span className="flex items-center gap-1">
            <Calendar size={10} />
            {formatDate(entry.lastSolvedAt)}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={10} />
            풀이 {entry.seenCount}회
          </span>
        </div>
      </header>

      <Card className="p-4">
        <div className="text-[10px] uppercase tracking-widest text-black/45 mb-2">
          문제
        </div>
        <div className="text-sm text-black/80 leading-relaxed break-keep whitespace-pre-wrap">
          {entry.itemLabel}
        </div>
      </Card>

      {entry.reasonTags.length > 0 && (
        <Card className="p-4 bg-amber-50/60 border-amber-200">
          <div className="text-[10px] uppercase tracking-widest text-amber-700 font-semibold mb-2 flex items-center gap-1">
            <BookOpen size={10} /> 짚어 본 원인
          </div>
          <div className="flex flex-wrap gap-1.5">
            {entry.reasonTags.map((t) => (
              <span
                key={t}
                className="text-[11px] px-2 py-0.5 rounded bg-white border border-amber-300 text-amber-900"
              >
                {REASON_TAG_LABEL[t]}
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4 bg-[#F8F9F6]">
        <div className="flex items-start gap-2.5">
          <div className="h-6 w-6 rounded-full bg-[#15803D] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles size={10} className="text-white" />
          </div>
          <div className="text-[12px] text-black/75 leading-relaxed break-keep">
            다시 풀면 워크스페이스가 결손 prereq 를 자동 진단해 리캡 카드를 띄웁니다.
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-2">
        <PrimaryButton
          href={`/v2/workspace/${entry.itemId}?mode=retry&from=notebook`}
          size="md"
        >
          <RefreshCw size={13} />
          다시 풀기
        </PrimaryButton>
      </div>
    </div>
  )
}
