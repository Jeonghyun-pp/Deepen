/**
 * Label 정규화 + Levenshtein 편집거리 기반 dedup 유틸.
 * Week 3 D3: naive exact match에서 fuzzy match로 확장.
 */

export function normalizeLabel(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * 짧은 단어는 오탐 위험이 크므로 편집거리 매칭 최소 길이를 강제한다.
 */
const MIN_LEN_FOR_FUZZY = 5;
const MAX_EDIT_DIST = 2;

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[a.length][b.length];
}

/**
 * candidates (정규화된 key)에서 query와 근접 매칭을 찾는다.
 * exact key 일치 또는 길이가 비슷하고 편집거리 ≤ 2.
 * 반환: 매칭된 key 또는 null.
 */
export function findFuzzyMatch(
  queryNorm: string,
  candidates: Iterable<string>,
): string | null {
  for (const c of candidates) {
    if (c === queryNorm) return c;
  }
  if (queryNorm.length < MIN_LEN_FOR_FUZZY) return null;
  for (const c of candidates) {
    if (c.length < MIN_LEN_FOR_FUZZY) continue;
    if (Math.abs(c.length - queryNorm.length) > MAX_EDIT_DIST) continue;
    if (levenshtein(c, queryNorm) <= MAX_EDIT_DIST) return c;
  }
  return null;
}
