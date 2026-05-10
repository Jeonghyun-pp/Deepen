/**
 * markOnboarded — 온보드 종료/스킵 시 호출. 멱등성 보장 (서버는 upsert).
 * 네트워크 실패해도 next 진행은 막지 않음 — 사용자는 redirect 한 번 더 봐도 ok.
 */
export async function markOnboarded(): Promise<void> {
  try {
    await fetch("/api/onboard/complete", {
      method: "POST",
      credentials: "include",
    })
  } catch {
    /* swallow — 다음 진입 시 다시 redirect 받으면 그만 */
  }
}
