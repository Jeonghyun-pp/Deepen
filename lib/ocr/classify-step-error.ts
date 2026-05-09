/**
 * unmatched user step → errorKind 분류 (Haiku).
 * Spec: docs/build-spec/05-llm-prompts.md §7, 04-algorithms.md §7.3.
 *
 * 정책:
 *   - 모델: claude-haiku (저비용)
 *   - 4초 timeout · Promise.allSettled 로 동시 호출 (최대 N=10)
 *   - 실패 시 errorKind=undefined → UI 가 generic 표시
 */

import { callClaudeTool } from "@/lib/clients/claude"
import type { ErrorKind } from "@/lib/api/schemas/ocr"

const MODEL = "claude-haiku-4-5-20251001"
const TIMEOUT_MS = 4000

const SYSTEM_PROMPT = `학생의 풀이 한 줄과, 정답 풀이에서 그것에 가장 가까운 단계가 주어집니다.

학생 줄을 다음 중 하나로 분류:
- match — 정답 단계와 본질적으로 같음
- extra_step — 정답 풀이에 없는 추가 단계 (불필요)
- wrong_substitution — 식 대입을 잘못함
- sign_error — 부호 실수
- missing_condition — 조건을 안 적었음
- arithmetic_error — 산수 실수`

const TOOL = {
  name: "classify_step_error",
  description: "학생 풀이 한 줄의 errorKind 분류.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      errorKind: {
        type: "string",
        enum: [
          "match",
          "extra_step",
          "wrong_substitution",
          "sign_error",
          "missing_condition",
          "arithmetic_error",
        ],
      },
      suggestion: { type: "string", maxLength: 80 },
    },
    required: ["errorKind"],
  },
}

interface ClassifyArgs {
  userStep: string
  nearestCanonicalStep: string | null
  cosineSim: number
}

interface ClassifyResult {
  errorKind: ErrorKind
  suggestion?: string
  inputTokens: number
  outputTokens: number
}

async function classifyOne(args: ClassifyArgs): Promise<ClassifyResult> {
  const userPrompt = [
    `학생: ${args.userStep}`,
    `정답에 가장 가까운: ${args.nearestCanonicalStep ?? "없음"}`,
    `유사도: ${args.cosineSim.toFixed(2)}`,
  ].join("\n")

  const result = await callClaudeTool<{
    errorKind: ErrorKind
    suggestion?: string
  }>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    tool: TOOL,
    maxTokens: 256,
    model: MODEL,
  })
  return {
    errorKind: result.data.errorKind,
    suggestion: result.data.suggestion,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("classify_timeout")),
      ms,
    )
    p.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

/**
 * 여러 unmatched step 동시 분류. Promise.allSettled 로 일부 실패 허용.
 */
export async function classifyUnmatchedSteps(
  items: ClassifyArgs[],
): Promise<Array<ClassifyResult | null>> {
  const settled = await Promise.allSettled(
    items.map((it) => withTimeout(classifyOne(it), TIMEOUT_MS)),
  )
  return settled.map((s) => (s.status === "fulfilled" ? s.value : null))
}
