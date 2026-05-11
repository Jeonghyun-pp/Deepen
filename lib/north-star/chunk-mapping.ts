/**
 * Chunk → Node 매핑 제안 (북극성 Stage 2).
 * Spec: docs/north-star-spec-2026-05-11.md §5.1
 *
 * Stage 2 minimal viable: 함수 시그니처 + 신뢰도 임계 정책 만. 실 LLM 호출은
 * sub-stage 에서 Claude Haiku 호출 wiring 후 활성 (콘텐츠 시드 없이 mock fixture
 * 로만 검증 가능).
 *
 * 정책:
 *   - confidence ≥ 0.7 → state='confirmed' (auto)
 *   - 0.4 ≤ confidence < 0.7 → state='proposed' (admin review)
 *   - confidence < 0.4 → 매핑 자체 안 함 (discarded)
 */

export const AUTO_CONFIRM_THRESHOLD = 0.7
export const PROPOSED_THRESHOLD = 0.4

export interface ChunkInput {
  id: string
  content: string
  sectionTitle: string | null
  pageStart: number | null
}

export interface NodeCandidate {
  id: string
  label: string
}

export interface MappingProposal {
  chunkId: string
  nodeId: string
  confidence: number
  justification?: string
}

/**
 * LLM 호출 placeholder. 실 구현 시 callClaudeTool 로 교체.
 * 현재는 mock — fixture 기반 단위 테스트만.
 */
export async function proposeChunkMappings(args: {
  chunks: ChunkInput[]
  nodes: NodeCandidate[]
  /** test 용 mock injector. production 에선 undefined. */
  mockProposer?: (
    chunks: ChunkInput[],
    nodes: NodeCandidate[],
  ) => Promise<MappingProposal[]>
}): Promise<MappingProposal[]> {
  if (args.mockProposer) {
    return args.mockProposer(args.chunks, args.nodes)
  }
  // Production placeholder — Haiku 호출 wiring 전까지 empty.
  // 실 활성 시: callClaudeTool({ system: SYSTEM, tool: PROPOSE_TOOL, ... })
  return []
}

export function classifyProposal(
  proposal: MappingProposal,
): "confirmed" | "proposed" | "discarded" {
  if (proposal.confidence >= AUTO_CONFIRM_THRESHOLD) return "confirmed"
  if (proposal.confidence >= PROPOSED_THRESHOLD) return "proposed"
  return "discarded"
}

/**
 * Persist 용 row 생성. classifyProposal 결과 'discarded' 는 row 안 만듦.
 */
export function buildMappingRows(args: {
  proposals: MappingProposal[]
  proposedBy: "llm" | "user"
}): Array<{
  chunkId: string
  nodeId: string
  state: "confirmed" | "proposed"
  confidence: number
  proposedBy: "llm" | "user"
}> {
  const rows: Array<{
    chunkId: string
    nodeId: string
    state: "confirmed" | "proposed"
    confidence: number
    proposedBy: "llm" | "user"
  }> = []
  for (const p of args.proposals) {
    const cls = classifyProposal(p)
    if (cls === "discarded") continue
    rows.push({
      chunkId: p.chunkId,
      nodeId: p.nodeId,
      state: cls,
      confidence: p.confidence,
      proposedBy: args.proposedBy,
    })
  }
  return rows
}
