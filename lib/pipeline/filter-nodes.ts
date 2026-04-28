/**
 * Stage 3.5 — 정규식 기반 노이즈 필터.
 *
 * LLM 추출 결과에서 *명백한* 변수·공식 표기·금액·표 참조를 제거한다.
 * 보수적 운영: false-positive 0 이 목표. 의미 판정이 필요한 노이즈
 * (도구·메타·일반어·서술 문장)은 Layer 2 LLM-Judge 단계로 미룬다.
 *
 * Phase 1 (a) — Phase 0 baseline 의 FP 34개 중 약 17~18개(50%) 즉시 제거.
 */

import type { ExtractedNode } from "./extract-nodes"

interface NoisePattern {
  name: string
  pattern: RegExp
  hint: string
}

const PATTERNS: NoisePattern[] = [
  // 단일 라틴 소문자 변수: i, n, x, k 등
  {
    name: "single_letter_lowercase",
    pattern: /^[a-z]$/,
    hint: "단일 소문자 변수",
  },

  // 라벨 *전체*가 수식 변수로만 구성 — 이태릭 math + 일반 그리스 + 숫자 + 수식 기호
  // 매치: 𝑞1, 𝛱2, 𝑇 𝐶1, 𝑑 −50 0.0 −43.5, 𝑞 = 5
  // 비매치: "Design of 𝒑 chart" (Latin 포함), "𝜇𝑟란 평균값" (Korean 포함)
  // → Latin/한글이 섞인 라벨은 의미 단계(Judge)로 미룸
  {
    name: "math_only_label",
    pattern: /^[\u{1D400}-\u{1D7FF}\u{0370}-\u{03FF}\d\s\-+−±.,()=/×÷_]+$/u,
    hint: "수식 변수만으로 구성된 라벨",
  },

  // 달러 금액으로 시작 — 특정 금액 인스턴스: $5,751, $1,000의 예금
  {
    name: "dollar_amount",
    pattern: /^\$[\d,]+(\.\d+)?/,
    hint: "달러 금액 예시",
  },

  // 퍼센트 + 의 + 단어 — 특정 이율 예시: 7%의 연이율, 6.5%의 수익률
  {
    name: "specific_rate_example",
    pattern: /^\d+(\.\d+)?%의\s+\S+/,
    hint: "퍼센트 예시 (7%의 연이율)",
  },

  // 대문자 prefix(2자+) + 소문자 subscript — 변수형: FVn, FVAn, PVAn
  // 주의: EAR(전부 대문자), MLE 같은 acronym 은 매치 안 됨
  {
    name: "uppercase_subscript_letter",
    pattern: /^[A-Z]{2,}[a-z]+$/,
    hint: "변수형 (FVn, FVAn)",
  },

  // 대문자 prefix(2자+) + 숫자 — 구체 변수: FVA5, PVA4
  {
    name: "uppercase_subscript_digit",
    pattern: /^[A-Z]{2,}\d+$/,
    hint: "구체 변수 (FVA5)",
  },

  // 공식 파라미터화: PVIFA10%,4years / PVIFAi,n / PVIFi,5yrs / FVIFA6%,5years
  // 패턴: 대문자 prefix + (숫자% | i) + , + 숫자/문자 subscript
  {
    name: "formula_instance",
    pattern: /^[A-Z]+(?:\d+(?:\.\d+)?%|i),\s*\d*\s*[a-z]*$/i,
    hint: "공식 인스턴스 (PVIFA10%,4years, PVIFAi,n)",
  },

  // Table N-N 형 참조: Table A-2, Table 1-3
  {
    name: "table_reference",
    pattern: /^[Tt]able\s+[A-Z0-9][\w-]*$/,
    hint: "Table 참조",
  },
]

export interface FilterRemoval {
  node: ExtractedNode
  reason: string
}

export interface FilterResult {
  kept: ExtractedNode[]
  removed: FilterRemoval[]
}

/**
 * 노이즈 패턴에 매칭되는 노드를 제거한다. 매칭 우선순위는 PATTERNS 순서.
 * label 은 trim 후 평가. 빈 label 은 통과시킴 (extract-nodes 단계에서 이미 제거됨).
 */
export function filterNoiseNodes(nodes: ExtractedNode[]): FilterResult {
  const kept: ExtractedNode[] = []
  const removed: FilterRemoval[] = []

  for (const node of nodes) {
    const label = node.label.trim()
    if (!label) {
      kept.push(node)
      continue
    }

    let matched: NoisePattern | null = null
    for (const p of PATTERNS) {
      if (p.pattern.test(label)) {
        matched = p
        break
      }
    }

    if (matched) {
      removed.push({ node, reason: `${matched.name} — ${matched.hint}` })
    } else {
      kept.push(node)
    }
  }

  return { kept, removed }
}

export const _patternsForTest = PATTERNS
