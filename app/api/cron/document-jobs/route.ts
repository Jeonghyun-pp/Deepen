/**
 * POST/GET /api/cron/document-jobs — 문서 처리 큐 nudge.
 *
 * 인증: Authorization: Bearer ${CRON_SECRET} (Vercel Cron 또는 외부 cron).
 *
 * 배경: 업로드 라우트(`app/api/documents/upload/route.ts`)가 `after()` 로
 *   1건만 처리한 뒤 응답. 큐에 여러 job 이 쌓이면 다음 업로드가 발생할 때까지
 *   처리 안 됨 — 사용자는 업로드를 한 번에 끝내고 떠나는 경우가 많아 정체.
 * 해결: cron 으로 큐 폴링. 매 10분마다 큐에서 최대 10건 직렬 처리.
 *   1건이 ~30~60초 (extract → chunk → embed) — 5분 maxDuration 안에 5~10건 흡수.
 *
 * 운영 메모:
 *   - 큰 PDF 가 단독으로 maxDuration 초과 시 job 은 in_progress 로 남고 lock 만료 후 재시도
 *   - processDocumentJobs 가 직렬이라 한 PDF 실패가 다음 job 을 막지 않음 (markJobFailed 후 계속)
 */
import { processDocumentJobs } from "@/lib/pipeline/document-job-runner"
import { checkCronAuth } from "@/lib/api/cron-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const BATCH_LIMIT = 10

async function handle(request: Request) {
  const auth = checkCronAuth(request)
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 })
  }

  try {
    const result = await processDocumentJobs({
      workerId: `cron-${Date.now()}`,
      limit: BATCH_LIMIT,
    })
    return Response.json({
      ok: true,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
    })
  } catch (e) {
    return Response.json(
      { ok: false, error: (e as Error).message ?? "unknown_error" },
      { status: 500 },
    )
  }
}

export const GET = handle
export const POST = handle
