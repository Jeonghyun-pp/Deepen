/**
 * /v2/me — 학생 본인 프로필 + 약점 surface (Stage 8: 실제 데이터 연결).
 *
 * 이전: client component + 전체 mock.
 * 변경: server component. user 정보 + totalAttempts + correctRate + weakTop5
 *       4종을 실 DB 에서 fetch. heatmap·contribution grid·prereq 결손은 도메인
 *       grouping 정보 부족으로 mock 유지 (안내 명시).
 */

import Link from "next/link"
import { and, asc, eq, sql } from "drizzle-orm"
import {
  Flame,
  Clock,
  Target,
  AlertTriangle,
  Settings,
  TrendingUp,
  ArrowRight,
} from "lucide-react"
import { requireUser } from "@/lib/auth/require-user"
import { db } from "@/lib/db"
import {
  nodes,
  patternState,
  users,
  userItemHistory,
} from "@/lib/db/schema"
import {
  Card,
  MasteryBar,
  SecondaryButton,
} from "../_components/ui"
import { LobbyHeader } from "../_components/LobbyHeader"
import { PageShell } from "../_components/ui"

export const dynamic = "force-dynamic"

const TOPIC_HEATMAP: { topic: string; values: number[] }[] = [
  { topic: "수학Ⅱ · 미분", values: [0.82, 0.66, 0.41, 0.74, 0.38, 0.55] },
  { topic: "수학Ⅱ · 적분", values: [0.71, 0.62, 0.58, 0.68, 0, 0] },
  { topic: "미적분 · 수열의 극한", values: [0.55, 0.48, 0.6, 0, 0, 0] },
  { topic: "미적분 · 미분법", values: [0.42, 0.38, 0.51, 0.59, 0.4, 0.36] },
  { topic: "미적분 · 적분법", values: [0.32, 0.28, 0.41, 0.38, 0, 0] },
]

interface WeakRow {
  patternId: string
  label: string
  theta: number
  attemptCount: number
}

export default async function MePage() {
  const { user } = await requireUser()

  // 1) 프로필 정보 — users.onboardedAt 가입일 surface
  const [profile] = await db
    .select({
      onboardedAt: users.onboardedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  // 2) 총 attempts + correct rate (result_history 의 모든 row 펼치기)
  const [stats] = (await db.execute(sql`
    SELECT
      COALESCE(SUM(seen_count), 0)::int AS "totalAttempts",
      COALESCE(
        AVG(
          (
            SELECT COUNT(*)::float / NULLIF(jsonb_array_length(result_history), 0)
            FROM jsonb_array_elements(result_history) AS r
            WHERE r->>'label' = 'correct'
          )
        ),
        0
      )::float AS "correctRate",
      COALESCE(
        SUM(
          (
            SELECT COALESCE(SUM((r->'signals'->>'timeMs')::bigint), 0)
            FROM jsonb_array_elements(result_history) AS r
          )
        ),
        0
      )::bigint AS "totalTimeMs"
    FROM ${userItemHistory}
    WHERE user_id = ${user.id}
  `)) as unknown as Array<{
    totalAttempts: number
    correctRate: number
    totalTimeMs: number | string
  }>

  const totalAttempts = stats?.totalAttempts ?? 0
  const correctRate = stats?.correctRate ?? 0
  const totalMinutes = Math.round(Number(stats?.totalTimeMs ?? 0) / 60_000)

  // 3) 약점 Top 5 — pattern_state.theta 오름차순, attempt ≥ 1
  const weakRows = (await db
    .select({
      patternId: patternState.patternId,
      label: nodes.label,
      theta: patternState.theta,
      attemptCount: patternState.attemptCount,
    })
    .from(patternState)
    .innerJoin(nodes, eq(nodes.id, patternState.patternId))
    .where(and(eq(patternState.userId, user.id), eq(nodes.type, "pattern")))
    .orderBy(asc(patternState.theta))
    .limit(5)) as WeakRow[]

  // 4) streak — KST 자정 기준 distinct date 연속일 (Stage 13)
  const streakRows = (await db.execute(sql`
    SELECT DISTINCT TO_CHAR((last_solved_at AT TIME ZONE 'Asia/Seoul')::date, 'YYYY-MM-DD') AS d
    FROM user_item_history
    WHERE user_id = ${user.id} AND last_solved_at IS NOT NULL
    ORDER BY d DESC
    LIMIT 60
  `)) as unknown as Array<{ d: string }>
  const studyDays = new Set(streakRows.map((r) => r.d))
  let streak = 0
  const todayKstIso = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }),
  )
    .toISOString()
    .slice(0, 10)
  // 어제부터 시작도 허용 (오늘 자정 전 풀러 올 시간 여유). 어제도 없으면 broken.
  const yesterdayKst = new Date(todayKstIso + "T00:00:00Z")
  yesterdayKst.setDate(yesterdayKst.getDate() - 1)
  const yesterdayKstIso = yesterdayKst.toISOString().slice(0, 10)
  let cursorStart: Date
  if (studyDays.has(todayKstIso)) {
    cursorStart = new Date(todayKstIso + "T00:00:00Z")
  } else if (studyDays.has(yesterdayKstIso)) {
    cursorStart = yesterdayKst
  } else {
    cursorStart = new Date(0) // streak = 0
  }
  if (cursorStart.getTime() > 0) {
    const cursor = new Date(cursorStart)
    for (let i = 0; i < 60; i++) {
      const iso = cursor.toISOString().slice(0, 10)
      if (studyDays.has(iso)) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      } else {
        break
      }
    }
  }

  // 5) prereq 결손 의심 — prereq_deficit_log 최근 row 3개 (Stage 13)
  const prereqRows = (await db.execute(sql`
    SELECT
      pdl.pattern_id           AS "patternId",
      pdl.deficit_probability  AS "deficitProbability",
      pdl.created_at           AS "createdAt",
      n.label                  AS "label",
      n.grade                  AS "grade"
    FROM prereq_deficit_log pdl
    JOIN public.nodes n ON n.id = pdl.pattern_id
    WHERE pdl.user_id = ${user.id}
    ORDER BY pdl.created_at DESC, pdl.deficit_probability DESC
    LIMIT 3
  `)) as unknown as Array<{
    patternId: string
    deficitProbability: number
    createdAt: Date
    label: string
    grade: string | null
  }>

  const hasAnyAttempt = totalAttempts > 0
  const memberSinceLabel = profile?.onboardedAt
    ? new Date(profile.onboardedAt).toLocaleDateString("ko-KR")
    : profile?.createdAt
      ? new Date(profile.createdAt).toLocaleDateString("ko-KR")
      : "—"

  return (
    <PageShell warmWash>
      <LobbyHeader active="me" />

      <main className="max-w-[1100px] mx-auto px-6 py-6 pb-20 space-y-6">
        {/* Header card */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 md:col-span-1 bg-gradient-to-br from-[#F0FDF4] to-white border-[#15803D]/15">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-[#15803D] flex items-center justify-center text-white font-bold text-lg shadow-[0_4px_12px_rgba(21,128,61,0.3)]">
                {(user.email ?? "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold truncate">{user.email}</div>
                <div className="text-[11px] text-black/55">가입 {memberSinceLabel}</div>
              </div>
            </div>
            <div className="space-y-2 text-[11px]">
              <Row label="목표 시험" value="설정 미연동" />
              <Row label="시험 범위" value="설정 미연동" />
              <Row label="가입" value={memberSinceLabel} />
            </div>
            <div className="mt-4 pt-4 border-t border-black/5">
              <SecondaryButton href="/v2/settings/parents" size="sm" className="w-full">
                <Settings size={12} />
                보호자 리포트
              </SecondaryButton>
            </div>
          </Card>

          <Card className="p-5 md:col-span-2">
            <div className="text-[10px] uppercase tracking-widest text-black/45 mb-4">
              학습 통계
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat
                label="streak"
                value={streak > 0 ? String(streak) : "—"}
                unit="일"
                icon={<Flame size={14} className="text-orange-500" />}
                muted={streak === 0}
              />
              <Stat
                label="총 풀이"
                value={String(totalAttempts)}
                unit="회"
                icon={<TrendingUp size={14} className="text-[#15803D]" />}
              />
              <Stat
                label="평균 정답률"
                value={hasAnyAttempt ? String(Math.round(correctRate * 100)) : "—"}
                unit="%"
              />
              <Stat
                label="누적 학습"
                value={hasAnyAttempt ? String(totalMinutes) : "—"}
                unit="분"
                icon={<Clock size={14} className="text-black/45" />}
              />
            </div>

            {!hasAnyAttempt && (
              <p className="mt-4 text-[11px] text-black/45">
                아직 풀이 기록이 없어요. 첫 문제를 풀어 보세요.
              </p>
            )}
          </Card>
        </section>

        {/* Heatmap — 도메인 grouping 정보 부족, 샘플 (단원 매핑 후 실데이터 전환 예정) */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Target size={13} className="text-[#15803D]" />
              과목·단원별 숙련도
              <span className="text-[9px] font-normal text-black/40 ml-1">(샘플)</span>
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-black/45">
              <span>0%</span>
              <div className="flex gap-0.5">
                {[0.2, 0.4, 0.6, 0.8, 1].map((v) => (
                  <div
                    key={v}
                    className="h-3 w-3 rounded-sm"
                    style={{ background: heatColor(v) }}
                  />
                ))}
              </div>
              <span>100%</span>
            </div>
          </div>

          <div className="space-y-2">
            {TOPIC_HEATMAP.map((t) => (
              <div key={t.topic} className="grid grid-cols-[180px_1fr] items-center gap-3">
                <div className="text-xs font-medium text-black/75">{t.topic}</div>
                <div className="grid grid-cols-6 gap-1">
                  {t.values.map((v, i) => (
                    <div
                      key={i}
                      className="h-7 rounded-sm flex items-center justify-center text-[10px] font-mono text-white/95"
                      style={{
                        background: v === 0 ? "#F1F5F9" : heatColor(v),
                        color: v === 0 ? "#94A3B8" : v < 0.4 ? "#fff" : v > 0.7 ? "#fff" : "rgba(0,0,0,0.7)",
                      }}
                    >
                      {v === 0 ? "—" : Math.round(v * 100)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Weakness Top 5 + Prereq gap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Target size={13} className="text-[#E11D48]" />
                약점 유형 Top 5
              </h2>
              <Link href="/v2/stats" className="text-[10px] text-black/45 hover:text-black/70">
                통계에서 보기 →
              </Link>
            </div>
            {weakRows.length === 0 ? (
              <p className="text-xs text-black/45">
                풀이 기록이 쌓이면 약점 유형이 표시됩니다.
              </p>
            ) : (
              <div className="space-y-3">
                {weakRows.map((w) => (
                  <Link
                    key={w.patternId}
                    href={`/v2/home`}
                    className="block rounded-lg border border-black/8 px-3 py-2.5 bg-white hover:border-black/20 transition"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-black/85 truncate">
                        {w.label}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          w.theta < 0.4 ? "text-[#E11D48]" : "text-amber-600"
                        }`}
                      >
                        {Math.round(w.theta * 100)}%
                      </span>
                    </div>
                    <MasteryBar value={w.theta} weak={w.theta < 0.4} size="sm" />
                    <div className="text-[10px] text-black/45 mt-1.5">
                      attempt {w.attemptCount}회
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle size={13} className="text-[#7C3AED]" />
                선행 결손 의심
              </h2>
              <span className="text-[10px] text-[#7C3AED] font-semibold">
                {prereqRows.length}개
              </span>
            </div>
            {prereqRows.length === 0 ? (
              <p className="text-xs text-black/45">
                아직 결손 신호가 누적되지 않았어요. 풀이 후 진단이 쌓이면 여기 표시됩니다.
              </p>
            ) : (
              <div className="space-y-3">
                {prereqRows.map((p) => (
                  <div
                    key={p.patternId + p.createdAt.toString()}
                    className="rounded-lg border border-[#7C3AED]/20 bg-[#FAF5FF] px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {p.grade && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#7C3AED]/15 text-[#6D28D9] font-bold shrink-0">
                            {p.grade}
                          </span>
                        )}
                        <span className="text-sm font-medium text-black/85 truncate">
                          {p.label}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-[#6D28D9] shrink-0">
                        {Math.round(p.deficitProbability * 100)}%
                      </span>
                    </div>
                    <MasteryBar value={p.deficitProbability} weak size="sm" />
                    <div className="text-[10px] text-black/45 mt-1.5">
                      {new Date(p.createdAt).toLocaleDateString("ko-KR")} 진단
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-black/5">
              <Link
                href="/v2/home"
                className="flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-[#15803D] group-hover:underline">
                    풀이 재개하기
                  </div>
                  <div className="text-[10px] text-black/50 mt-0.5">
                    선행 개념 복구 → 원래 문제 재풀이
                  </div>
                </div>
                <ArrowRight size={14} className="text-[#15803D]" />
              </Link>
            </div>
          </Card>
        </div>
      </main>
    </PageShell>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-black/50">{label}</span>
      <span className="font-medium text-black/80">{value}</span>
    </div>
  )
}

function Stat({
  label,
  value,
  unit,
  icon,
  muted = false,
}: {
  label: string
  value: string
  unit?: string
  icon?: React.ReactNode
  muted?: boolean
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-black/40 mb-1">
        {icon}
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={`text-2xl font-bold ${muted ? "text-black/30" : ""}`}
        >
          {value}
        </span>
        {unit && <span className="text-[11px] text-black/45">{unit}</span>}
      </div>
    </div>
  )
}

function heatColor(v: number) {
  if (v <= 0.2) return "#DCFCE7"
  if (v <= 0.4) return "#86EFAC"
  if (v <= 0.6) return "#4ADE80"
  if (v <= 0.8) return "#22C55E"
  return "#15803D"
}

