// In-memory approval queue.
// WARNING: serverless 환경(여러 인스턴스)에서는 인스턴스 간 공유되지 않는다.
// Mock/로컬 단계 전용. 추후 Redis/DB로 이전 필요.

type PendingEntry = {
  resolve: (decisions: Record<string, boolean>) => void;
  timeout: ReturnType<typeof setTimeout>;
};

const pending = new Map<string, PendingEntry>();

const APPROVAL_TIMEOUT_MS = 5 * 60 * 1000; // 5분

/**
 * 사용자 승인을 기다린다. /api/agent/approve 가 resolveApproval을 호출하면
 * 이 Promise가 resolve된다.
 */
export function waitForApproval(
  sessionId: string,
): Promise<Record<string, boolean>> {
  return new Promise((resolve) => {
    // 기존 pending 이 있으면 거부 처리
    const existing = pending.get(sessionId);
    if (existing) {
      clearTimeout(existing.timeout);
      existing.resolve({});
    }
    const timeout = setTimeout(() => {
      pending.delete(sessionId);
      resolve({});
    }, APPROVAL_TIMEOUT_MS);
    pending.set(sessionId, { resolve, timeout });
  });
}

/**
 * 외부(/api/agent/approve)에서 호출. 대기 중인 Promise를 resolve.
 */
export function resolveApproval(
  sessionId: string,
  decisions: Record<string, boolean>,
): boolean {
  const entry = pending.get(sessionId);
  if (!entry) return false;
  clearTimeout(entry.timeout);
  pending.delete(sessionId);
  entry.resolve(decisions);
  return true;
}
