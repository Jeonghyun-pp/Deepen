/**
 * Prereq overlap (item.requiresPrereq 교집합 비율) — M3.3.
 * Spec: 04-algorithms.md §4.3 GAMMA = 0.15.
 *
 * Item 의 requiresPrereq = Pattern --prerequisite--> ... 닫힘. 우리 모델에서는
 * "Item 이 contains 된 Pattern 들" + "그 Pattern 의 직접 prereq Pattern 들" 합집합.
 *
 * overlap(A, B) = |A ∩ B| / max(|A ∪ B|, 1)
 *               = jaccard 와 동일한 정의 (이름만 분리 — 의미가 다른 입력에 적용).
 */
export function prereqOverlap(
  a: string[] | null,
  b: string[] | null,
): number {
  if (!a || !b) return 0
  if (a.length === 0 && b.length === 0) return 0
  const A = new Set(a)
  const B = new Set(b)
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  const union = A.size + B.size - inter
  return union === 0 ? 0 : inter / union
}
