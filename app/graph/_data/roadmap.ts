import type { GraphData, EdgeType, Roadmap } from "./types";

// ============================================================
// Prereq edge direction mapping
//
// 각 엣지 타입이 학습 prerequisite 관계에서 어떤 방향을 의미하는지.
//   "target-prereq": e.source가 e.target에 의존 → e.target이 prereq
//   "source-prereq": e.target이 e.source에 의존 → e.source가 prereq
//   "skip": prereq 관계 아님 (양방향 연관성)
// ============================================================
type PrereqDirection = "target-prereq" | "source-prereq" | "skip";

const PREREQ_DIRECTION: Record<EdgeType, PrereqDirection> = {
  // prerequisite(A → B)는 명시적: target이 prereq
  prerequisite: "target-prereq",
  // contains(상위 → 하위): 하위 학습엔 상위가 prereq → source가 prereq
  contains: "source-prereq",
  // 양방향 연관, prereq 아님
  relatedTo: "skip",
};

// ============================================================
// buildRoadmapFromTarget
//
// target 노드에서 reverse BFS로 모든 transitive prereq를 모은 뒤,
// BFS depth 역순으로 정렬해 노드 시퀀스를 만든다.
// (가장 먼 prereq → ... → target)
//
// maxDepth로 폭주 방지. 기본 3.
// ============================================================
export function buildRoadmapFromTarget(
  graph: GraphData,
  targetId: string,
  maxDepth = 3,
): string[] {
  const depth = new Map<string, number>();
  depth.set(targetId, 0);
  const queue: string[] = [targetId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const d = depth.get(current)!;
    if (d >= maxDepth) continue;

    for (const e of graph.edges) {
      const dir = PREREQ_DIRECTION[e.type];
      if (dir === "skip") continue;

      let prereqId: string | null = null;
      if (dir === "target-prereq" && e.source === current) {
        prereqId = e.target;
      } else if (dir === "source-prereq" && e.target === current) {
        prereqId = e.source;
      }

      if (prereqId && !depth.has(prereqId)) {
        depth.set(prereqId, d + 1);
        queue.push(prereqId);
      }
    }
  }

  // depth 큰 것(먼 prereq)부터 → target은 마지막
  return [...depth.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

// ============================================================
// Seed roadmaps
// 큐레이션된 학습 path. source: "seed".
// ============================================================
export const SEED_ROADMAPS: Roadmap[] = [
  {
    id: "seed-transformer",
    title: "Transformer 이해",
    nodeIds: ["p8", "p1", "c_self_attention", "c_transformer_arch", "p2", "p3"],
    source: "seed",
    description: "Seq2Seq → Attention → BERT/GPT 흐름",
    createdAt: "2026-04-11T00:00:00.000Z",
  },
  {
    id: "seed-diffusion",
    title: "Diffusion 모델 흐름",
    nodeIds: ["p6", "t_denoising", "p22", "p23"],
    source: "seed",
    description: "DDPM → Stable Diffusion → DALL-E 2",
    createdAt: "2026-04-11T00:00:00.000Z",
  },
  {
    id: "seed-rl",
    title: "강화학습 기초",
    nodeIds: ["p26", "c_value_learning", "p28", "c_policy_gradient", "p27", "p33"],
    source: "seed",
    description: "DQN → PPO → AlphaGo → AlphaZero",
    createdAt: "2026-04-11T00:00:00.000Z",
  },
];
