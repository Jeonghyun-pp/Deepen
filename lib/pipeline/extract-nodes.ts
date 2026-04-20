/**
 * Stage 3 — LLM node extraction (per section).
 * gpt-4o-mini + structured JSON schema. 섹션별 병렬, 실패 격리.
 *
 * 플랜 §2.1 제약:
 *   - 섹션당 최대 15 노드
 *   - 모든 노드는 최소 1개 chunk (ordinal)에 매핑
 */

import OpenAI from "openai"
import type { Section } from "./group-sections"

const MAX_NODES_PER_SECTION = 15
const NODE_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini"
const MAX_PARALLEL = 5

const NODE_TYPES = [
  "concept",
  "technique",
  "application",
  "question",
] as const

const SYSTEM_PROMPT = `당신은 강의안에서 "마스터리 검증이 가능한 단위 개념" + "개념 간 관계"를 함께 뽑는 추출기다.

## 노드 추출

추출 대상 (노드로 만들 것):
- 정의형: 명시적 정의가 있는 용어 ("X란 ...")
- 정리/결과형: 이름이 붙은 정리·공리 (Bayes' theorem, CLT 등)
- 기법/절차형: 명명된 알고리즘·방법 (EM, Backpropagation 등)
- 핵심 개념: 섹션 내 반복되며 설명 블록을 가진 용어

제외 (노드로 만들지 말 것):
- 일회성 언급, 예시, 비유, 전환 문구
- 섹션 제목 자체
- 부연 설명용 일반 명사

출력 제약:
- 섹션당 최대 ${MAX_NODES_PER_SECTION}개
- 500~1000 단어당 1개 휴리스틱
- 각 노드는 반드시 chunkOrdinals 에 1개 이상의 chunk 번호 (입력에 [chunk N] 으로 표시됨)
- tldr 은 1~2 문장 (80자 내외)

## 엣지 추출 (이 섹션 안의 노드들 사이만)

방금 뽑은 노드들 간의 관계를 edges 로 추가로 출력한다. 2종:
- **prerequisite**: A를 먼저 이해해야 B를 이해할 수 있는 학습 의존 관계. 본문에 "A의 개념을 바탕으로 B를 정의한다", "B는 A의 일반화", "A로부터 B가 유도된다" 같은 근거가 있어야 한다. 추측 금지.
- **contains**: 상위 개념이 하위 개념을 포함하는 분류 관계. "A는 B, C, D 세 종류로 나뉜다", "A에는 B라는 하위 케이스가 있다" 같은 분류·포함이 명시된 경우만.

엣지 제약:
- from/to 는 같은 섹션 안에서 뽑은 노드의 label 문자열. 존재하지 않는 노드는 쓰지 마라.
- 섹션 안 관계만. 섹션을 넘나드는 관계는 추출하지 마라.
- 확신 없으면 엣지를 만들지 마라. 노드 N개당 엣지 M개 중 M ≤ N 권장.
- self-loop 금지 (from == to 금지).`

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    nodes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string", description: "노드 이름 (원문 용어 유지)" },
          type: {
            type: "string",
            enum: [...NODE_TYPES],
            description: "노드 분류",
          },
          tldr: { type: "string", description: "1~2 문장 요약" },
          chunkOrdinals: {
            type: "array",
            items: { type: "integer" },
            description: "출처 chunk 번호 (입력에 표시된 값)",
          },
        },
        required: ["label", "type", "tldr", "chunkOrdinals"],
      },
    },
    edges: {
      type: "array",
      description:
        "섹션 내 노드들 사이의 관계. 근거가 명시된 prerequisite / contains 만.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          from: { type: "string", description: "출발 노드 label" },
          to: { type: "string", description: "도착 노드 label" },
          type: {
            type: "string",
            enum: ["prerequisite", "contains"],
            description:
              "prerequisite = 선수 학습 의존, contains = 상위→하위 분류",
          },
        },
        required: ["from", "to", "type"],
      },
    },
  },
  required: ["nodes", "edges"],
} as const

export interface ExtractedNode {
  label: string
  type: "concept" | "technique" | "application" | "question"
  tldr: string
  chunkOrdinals: number[]
}

export interface ExtractedEdge {
  from: string
  to: string
  type: "prerequisite" | "contains"
}

export interface SectionUsage {
  promptTokens: number
  completionTokens: number
}

export const EXTRACT_MODEL = NODE_MODEL

let _client: OpenAI | null = null
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _client
}

/**
 * 섹션 1개에서 노드 추출. 실패 시 빈 결과 반환 (throw 안 함).
 */
export async function extractNodesFromSection(
  section: Section
): Promise<{
  nodes: ExtractedNode[]
  edges: ExtractedEdge[]
  error?: string
  usage?: SectionUsage
}> {
  // text chunk만 모으고 각 chunk에 [chunk N] 마커를 붙여 LLM이 citation 가능하게 한다
  const textChunks = section.chunks.filter((c) => c.contentType === "text")
  if (textChunks.length === 0) {
    return { nodes: [], edges: [] }
  }

  const userPrompt = [
    section.title ? `섹션 제목: ${section.title}\n` : "",
    "--- 섹션 본문 ---",
    textChunks
      .map((c) => `[chunk ${c.ordinal}] ${c.content}`)
      .join("\n\n"),
    "--- 끝 ---",
    "위 본문에서 노드와 노드 간 관계(edges)를 함께 추출하라. chunkOrdinals 에는 [chunk N] 의 N 값만, edges 의 from/to 는 너가 뽑은 노드의 label.",
  ].join("\n")

  try {
    const res = await getClient().chat.completions.create({
      model: NODE_MODEL,
      temperature: 0.1,
      max_tokens: 1500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "node_extraction",
          schema: JSON_SCHEMA as unknown as Record<string, unknown>,
          strict: true,
        },
      },
    })

    const content = res.choices[0]?.message?.content
    if (!content) return { nodes: [], edges: [], error: "empty_response" }

    const parsed = JSON.parse(content) as {
      nodes: ExtractedNode[]
      edges?: ExtractedEdge[]
    }
    const validOrdinals = new Set(textChunks.map((c) => c.ordinal))

    // 유효한 chunkOrdinals만 남기고, 하나도 안 남은 노드는 제거
    const nodes = parsed.nodes
      .slice(0, MAX_NODES_PER_SECTION)
      .map((n) => ({
        ...n,
        chunkOrdinals: n.chunkOrdinals.filter((o) => validOrdinals.has(o)),
      }))
      .filter((n) => n.chunkOrdinals.length > 0 && n.label.trim())

    // 엣지: from/to 가 추출된 노드 label 중에 있어야 하고 self-loop 금지
    const labelSet = new Set(nodes.map((n) => n.label.trim()))
    const edges: ExtractedEdge[] = (parsed.edges ?? [])
      .map((e) => ({
        from: (e.from ?? "").trim(),
        to: (e.to ?? "").trim(),
        type: e.type,
      }))
      .filter(
        (e) =>
          e.from &&
          e.to &&
          e.from !== e.to &&
          labelSet.has(e.from) &&
          labelSet.has(e.to) &&
          (e.type === "prerequisite" || e.type === "contains")
      )

    const usage: SectionUsage = {
      promptTokens: res.usage?.prompt_tokens ?? 0,
      completionTokens: res.usage?.completion_tokens ?? 0,
    }

    return { nodes, edges, usage }
  } catch (e) {
    return {
      nodes: [],
      edges: [],
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

/**
 * 여러 섹션을 병렬 (max 5) 처리. 실패한 섹션은 로그만 남기고 진행.
 */
export async function extractNodesFromSections(
  sections: Section[],
  onProgress?: (done: number, total: number) => void
): Promise<{
  results: ExtractedNode[][]
  edgeResults: ExtractedEdge[][]
  totalUsage: SectionUsage
}> {
  const results: ExtractedNode[][] = new Array(sections.length)
  const edgeResults: ExtractedEdge[][] = new Array(sections.length)
  const totalUsage: SectionUsage = { promptTokens: 0, completionTokens: 0 }
  let cursor = 0
  let done = 0

  async function worker() {
    while (cursor < sections.length) {
      const i = cursor++
      const section = sections[i]
      const { nodes, edges, error, usage } =
        await extractNodesFromSection(section)
      if (error) {
        console.warn(
          `[extract-nodes] section ${i} failed: ${error} (title=${section.title})`
        )
      }
      if (usage) {
        totalUsage.promptTokens += usage.promptTokens
        totalUsage.completionTokens += usage.completionTokens
      }
      results[i] = nodes
      edgeResults[i] = edges
      done++
      onProgress?.(done, sections.length)
    }
  }

  const workers = Array.from(
    { length: Math.min(MAX_PARALLEL, sections.length) },
    () => worker()
  )
  await Promise.all(workers)
  return { results, edgeResults, totalUsage }
}
