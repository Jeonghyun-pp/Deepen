/**
 * itemSolution 텍스트 → 줄 단위 canonical step 배열.
 * Spec: docs/build-spec/08-q2-build.md M2.2.
 *
 * 정책:
 *   - 빈 줄·whitespace-only 제거
 *   - 1줄 = 1 step. 시드 작업자가 작성한 해설을 그대로.
 *   - "정답: ..." 같은 prefix 줄도 step 으로 (alignLCS 가 다룸).
 */

export function splitCanonicalSteps(itemSolution: string | null | undefined): string[] {
  if (!itemSolution) return []
  return itemSolution
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}
