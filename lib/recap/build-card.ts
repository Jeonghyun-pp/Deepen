/**
 * 리캡카드 빌드 — Anthropic tool_use.
 * Spec: docs/build-spec/05-llm-prompts.md §3, 04-algorithms.md §5.
 *
 * 입력: prereq Pattern + 현재 Item.
 * 출력: RecapCard (학년 배지 + 1줄 why + 3줄 핵심 + 확인 퀴즈).
 *
 * 검증 위반 시 1회 재시도. 그래도 실패면 fallback 카드.
 */

import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { nodes } from "@/lib/db/schema"
import { callClaudeTool } from "@/lib/clients/claude"
import { recordTokenUsage } from "@/lib/db/token-usage"
import { fallbackRecapCard } from "./fallback"
import type { RecapCard } from "./types"

const SYSTEM_PROMPT = `당신은 한국 중·고등 수학을 가르치는 강사입니다. 학생이 현재 입시 문제를 못 푸는 진짜 원인이 이전 학년의 prereq 결손이라고 진단되었습니다.

당신의 임무: 그 prereq 개념을 1~3분 안에 복습할 수 있는 짧은 카드 한 장을 만듭니다.

카드 구조 (형식 lock):
- name: prereq 개념 이름 (8자 이내)
- grade: 학년 표기 ('중3', '고1' 등)
- whyNeeded: 왜 이 prereq가 현재 문제 풀이에 필요한가 (60자 이내, 1줄)
- coreBullets: 정확히 3줄. 각 줄 80자 이내. 핵심 공식·조건·활용 순.
- checkQuiz: 한 문항 단답식 또는 OX. 카드 내용으로 풀 수 있어야 함.

규칙:
- 일반 교과서 설명 X. 현재 입시 문제와 연결된 핵심만.
- coreBullets 에 수식 사용 OK (LaTeX 백슬래시). 한 줄에 수식 1개까지.
- checkQuiz 는 학생이 30초 안에 답할 수 있어야 함.`

const TOOL = {
  name: "emit_recap_card",
  description:
    "한 prereq 개념을 1~3분 분량으로 압축한 리캡카드를 생성합니다.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: "string", maxLength: 30 },
      grade: { type: "string" },
      durationMin: { type: "integer", enum: [1, 2, 3] },
      whyNeeded: { type: "string", maxLength: 60 },
      coreBullets: {
        type: "array",
        items: { type: "string", maxLength: 80 },
        minItems: 3,
        maxItems: 3,
      },
      checkQuiz: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string", maxLength: 200 },
          answer: { type: "string", maxLength: 100 },
          hint: { type: "string", maxLength: 80 },
        },
        required: ["question", "answer", "hint"],
      },
    },
    required: [
      "name",
      "grade",
      "durationMin",
      "whyNeeded",
      "coreBullets",
      "checkQuiz",
    ],
  },
}

interface EmittedCard {
  name: string
  grade: string
  durationMin: 1 | 2 | 3
  whyNeeded: string
  coreBullets: string[]
  checkQuiz: { question: string; answer: string; hint: string }
}

interface BuildArgs {
  userId: string
  patternId: string
  triggerItemId: string
  /** 사용자 마스터리 (theta) — system context 동봉. */
  userTheta: number
}

function validateCard(c: EmittedCard): boolean {
  return (
    c.coreBullets.length === 3 &&
    c.coreBullets.every((b) => b.length > 0 && b.length <= 80) &&
    c.whyNeeded.length > 0 &&
    c.whyNeeded.length <= 60 &&
    c.name.length > 0 &&
    !!c.checkQuiz?.question &&
    !!c.checkQuiz?.answer
  )
}

async function fetchContext(args: BuildArgs) {
  const [pattern] = await db
    .select({
      id: nodes.id,
      label: nodes.label,
      grade: nodes.grade,
      signature: nodes.signature,
    })
    .from(nodes)
    .where(and(eq(nodes.id, args.patternId), eq(nodes.type, "pattern")))
    .limit(1)

  const [item] = await db
    .select({
      id: nodes.id,
      label: nodes.label,
      itemSolution: nodes.itemSolution,
    })
    .from(nodes)
    .where(and(eq(nodes.id, args.triggerItemId), eq(nodes.type, "item")))
    .limit(1)

  return { pattern, item }
}

function buildUserPrompt(
  patternLabel: string,
  patternGrade: string | null,
  signature: string[] | null,
  itemLabel: string,
  itemSolution: string | null,
  userTheta: number,
): string {
  return [
    "<current_item>",
    `  <text>${itemLabel}</text>`,
    `  <solution_summary>${(itemSolution ?? "").slice(0, 200)}</solution_summary>`,
    "</current_item>",
    "",
    "<prereq_pattern>",
    `  <name>${patternLabel}</name>`,
    `  <grade>${patternGrade ?? ""}</grade>`,
    `  <signature>${(signature ?? []).join(", ")}</signature>`,
    "</prereq_pattern>",
    "",
    "<user>",
    `  <mastery>${userTheta.toFixed(2)}</mastery>`,
    "</user>",
  ].join("\n")
}

export async function buildRecapCard(args: BuildArgs): Promise<RecapCard> {
  const { pattern, item } = await fetchContext(args)
  if (!pattern || !item) {
    throw new Error("recap_context_missing")
  }

  const signature = (pattern.signature as string[] | null) ?? null
  const userPrompt = buildUserPrompt(
    pattern.label,
    pattern.grade,
    signature,
    item.label,
    item.itemSolution,
    args.userTheta,
  )

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await callClaudeTool<EmittedCard>({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt,
        tool: TOOL,
        maxTokens: 1024,
      })

      // 토큰 기록 (실패해도 본 흐름 막지 않음)
      void recordTokenUsage({
        userId: args.userId,
        source: "recap_build_card",
        model: result.model,
        promptTokens: result.inputTokens,
        completionTokens: result.outputTokens,
        meta: { patternId: args.patternId, attempt },
      })

      const c = result.data
      if (!validateCard(c)) {
        if (attempt === 0) continue
        break
      }

      return {
        patternId: args.patternId,
        grade: c.grade,
        name: c.name,
        durationMin: c.durationMin,
        whyNeeded: c.whyNeeded,
        coreBullets: [c.coreBullets[0], c.coreBullets[1], c.coreBullets[2]],
        checkQuiz: c.checkQuiz,
        triggerItemId: args.triggerItemId,
      }
    } catch (e) {
      if (attempt === 1) {
        console.warn("[recap.build-card] LLM 실패 → fallback", e)
        break
      }
    }
  }

  // fallback
  return fallbackRecapCard({
    patternId: args.patternId,
    patternLabel: pattern.label,
    grade: pattern.grade,
    signature,
    triggerItemId: args.triggerItemId,
  })
}
