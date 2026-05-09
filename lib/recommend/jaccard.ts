/**
 * Jaccard 유사도 — signature 배열 기반.
 * Spec: 04-algorithms.md §4.3 ALPHA = 0.30.
 *
 * jaccard(A, B) = |A ∩ B| / |A ∪ B|
 * 둘 다 비어 있으면 0 (정의상 불연성).
 */
export function jaccard(a: string[] | null, b: string[] | null): number {
  if (!a || !b) return 0
  if (a.length === 0 && b.length === 0) return 0
  const A = new Set(a)
  const B = new Set(b)
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  const union = A.size + B.size - inter
  return union === 0 ? 0 : inter / union
}
