/**
 * /v2/exam/[unitId] — 실전 모드 entry.
 * Spec: docs/build-spec/06-state-machines.md §2, M2.5.
 *
 * Q2 (M2.5) 단순화: 단원의 첫 published Item 을 mode='exam' 으로 redirect.
 *                   batch (N개 연속 풀이) 는 후속 작업.
 *
 * exam UX (현재 작동):
 *   - SolveClient 가 mode='exam' 보면 ExamTimerInline 활성 + CoachPanel·
 *     HintButton 비활성. attempts payload mode='exam'.
 *   - 서버가 ai_questions·hints > 0 거절. recap 차단. 일반 채점 결과 표시.
 *
 * 후속:
 *   - batch (5문제 연속) + BatchResult 페이지
 *   - 시간 다 되면 자동 다음 문제로 이동
 */

import { redirect } from "next/navigation"
import { and, asc, eq } from "drizzle-orm"
import { requireUser } from "@/lib/auth/require-user"
import { db } from "@/lib/db"
import { nodes } from "@/lib/db/schema"

interface Props {
  params: Promise<{ unitId: string }>
}

export const dynamic = "force-dynamic"

export default async function ExamPage({ params }: Props) {
  await params // unitId 는 Q2 단일 단원 가정으로 무시 (필터 X)
  await requireUser()

  const [first] = await db
    .select({ id: nodes.id })
    .from(nodes)
    .where(and(eq(nodes.type, "item"), eq(nodes.status, "published")))
    .orderBy(asc(nodes.createdAt))
    .limit(1)

  if (!first) {
    redirect("/v2/home")
  }
  redirect(`/v2/solve/${first.id}?mode=exam`)
}
