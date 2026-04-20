/**
 * 에러 리포팅 추상화.
 *
 * 현재는 console.error로만 출력. Sentry 통합 시:
 *   1) `npm install @sentry/nextjs`
 *   2) `SENTRY_DSN` env 추가
 *   3) 아래 stub을 `import * as Sentry from "@sentry/nextjs"` 사용하도록 교체
 *   4) `instrumentation.ts`에서 Sentry.init() (Next 16 패턴)
 *
 * 호출 측 코드는 바뀌지 않는다.
 */

export interface ErrorContext {
  userId?: string
  route?: string
  extra?: Record<string, unknown>
}

export function reportError(
  err: unknown,
  ctx: ErrorContext = {},
): void {
  const msg = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined
  console.error("[reportError]", msg, { ...ctx, stack })

  // TODO(Sentry): 패키지 설치 후 아래 주석 활성화
  // if (process.env.SENTRY_DSN) {
  //   const Sentry = await import("@sentry/nextjs")
  //   Sentry.captureException(err, { user: ctx.userId ? { id: ctx.userId } : undefined, extra: ctx.extra })
  // }
}
