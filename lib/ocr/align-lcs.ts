/**
 * 학생 풀이 단계 ↔ 정답 풀이 단계 정렬 — LCS DP + Jaro-Winkler.
 * Spec: docs/build-spec/04-algorithms.md §7.2.
 *
 * Q2 (M2.2) 단순화:
 *   - semanticSim = Jaro-Winkler (string 유사도). 임베딩 cosine 은 M3.3.
 *   - SIM_THRESHOLD = 0.7 lock.
 *   - matched=true 인 페어만 LCS 백트랙 매칭. 나머지는 unmatched 로.
 *
 * 입력: userSteps × canonicalSteps
 * 출력: AlignedStep[] (모든 user/canonical step 을 한 row 로 표현)
 */

import type { AlignedStep } from "@/lib/api/schemas/ocr"

export const SIM_THRESHOLD = 0.7

// ────────── Jaro-Winkler ──────────

export function jaroWinkler(s1: string, s2: string): number {
  const a = s1.toLowerCase().trim()
  const b = s2.toLowerCase().trim()
  if (a === b) return 1
  if (a.length === 0 || b.length === 0) return 0

  const matchDistance = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1)
  const aMatches: boolean[] = new Array(a.length).fill(false)
  const bMatches: boolean[] = new Array(b.length).fill(false)
  let matches = 0
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchDistance)
    const end = Math.min(b.length, i + matchDistance + 1)
    for (let j = start; j < end; j++) {
      if (bMatches[j]) continue
      if (a[i] !== b[j]) continue
      aMatches[i] = true
      bMatches[j] = true
      matches++
      break
    }
  }
  if (matches === 0) return 0

  let transpositions = 0
  let k = 0
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue
    while (!bMatches[k]) k++
    if (a[i] !== b[k]) transpositions++
    k++
  }
  transpositions /= 2

  const m = matches
  const jaro =
    (m / a.length + m / b.length + (m - transpositions) / m) / 3

  // Winkler bonus — common prefix up to 4
  let prefix = 0
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++
    else break
  }
  return jaro + prefix * 0.1 * (1 - jaro)
}

// ────────── LCS DP ──────────

interface MatchPair {
  userIdx: number
  canonicalIdx: number
  sim: number
}

/**
 * userSteps × canonicalSteps 매트릭스에 sim ≥ THRESHOLD 일 때만 매칭으로
 * 인정해 LCS 길이 최대 페어링을 backtrack.
 */
function lcsMatchPairs(
  userSteps: string[],
  canonicalSteps: string[],
): MatchPair[] {
  const N = userSteps.length
  const M = canonicalSteps.length
  if (N === 0 || M === 0) return []

  const sim: number[][] = []
  for (let i = 0; i < N; i++) {
    const row: number[] = []
    for (let j = 0; j < M; j++) {
      row.push(jaroWinkler(userSteps[i], canonicalSteps[j]))
    }
    sim.push(row)
  }

  // dp[i][j] = LCS length up to userSteps[0..i-1] × canonicalSteps[0..j-1]
  const dp: number[][] = Array.from({ length: N + 1 }, () =>
    new Array(M + 1).fill(0),
  )
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= M; j++) {
      const matchOk = sim[i - 1][j - 1] >= SIM_THRESHOLD
      if (matchOk) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // backtrack
  const pairs: MatchPair[] = []
  let i = N
  let j = M
  while (i > 0 && j > 0) {
    const matchOk = sim[i - 1][j - 1] >= SIM_THRESHOLD
    if (matchOk && dp[i][j] === dp[i - 1][j - 1] + 1) {
      pairs.push({
        userIdx: i - 1,
        canonicalIdx: j - 1,
        sim: sim[i - 1][j - 1],
      })
      i--
      j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }
  pairs.reverse()
  return pairs
}

/**
 * AlignedStep[] 으로 직렬화.
 * 매칭 페어 사이의 unmatched user step 은 별도 row 로,
 * unmatched canonical step 도 별도 row 로 (학생이 빠뜨린 단계).
 */
export function alignLCS(args: {
  userSteps: string[]
  canonicalSteps: string[]
}): { aligned: AlignedStep[]; unmatchedUserIdxs: number[] } {
  const { userSteps, canonicalSteps } = args
  const pairs = lcsMatchPairs(userSteps, canonicalSteps)

  // 매칭 set
  const matchedUser = new Set(pairs.map((p) => p.userIdx))
  const matchedCanonical = new Set(pairs.map((p) => p.canonicalIdx))

  // 두 인덱스를 동시 진행하며 row 생성
  const aligned: AlignedStep[] = []
  let pi = 0
  let ui = 0
  let ci = 0
  let stepIdx = 0
  while (
    pi < pairs.length ||
    ui < userSteps.length ||
    ci < canonicalSteps.length
  ) {
    // 다음 매칭 페어 까지의 unmatched 줄을 먼저 flush.
    const targetUser = pi < pairs.length ? pairs[pi].userIdx : userSteps.length
    const targetCanonical =
      pi < pairs.length ? pairs[pi].canonicalIdx : canonicalSteps.length

    while (ui < targetUser && !matchedUser.has(ui)) {
      aligned.push({
        stepIdx: stepIdx++,
        userText: userSteps[ui],
      })
      ui++
    }
    while (ci < targetCanonical && !matchedCanonical.has(ci)) {
      aligned.push({
        stepIdx: stepIdx++,
        canonicalText: canonicalSteps[ci],
        // user 가 빠뜨린 단계 → missing_condition 후보. classify 가 보강.
      })
      ci++
    }

    if (pi < pairs.length) {
      const p = pairs[pi]
      aligned.push({
        stepIdx: stepIdx++,
        userText: userSteps[p.userIdx],
        canonicalText: canonicalSteps[p.canonicalIdx],
        errorKind: "match",
      })
      ui = p.userIdx + 1
      ci = p.canonicalIdx + 1
      pi++
    }
  }

  const unmatchedUserIdxs = userSteps
    .map((_, i) => i)
    .filter((i) => !matchedUser.has(i))

  return { aligned, unmatchedUserIdxs }
}
