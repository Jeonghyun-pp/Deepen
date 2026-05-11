import {
  claimNextDocumentJob,
  markDocumentJobFailed,
  markDocumentJobSucceeded,
  recordDocumentProcessingEvent,
  type ClaimedDocumentJob,
} from "./document-jobs"
import { processDocument } from "./process-document"

export interface ProcessDocumentJobResult {
  job: ClaimedDocumentJob
  ok: boolean
  error?: string
}

export async function processNextDocumentJob(
  workerId: string
): Promise<ProcessDocumentJobResult | null> {
  const job = await claimNextDocumentJob(workerId)
  if (!job) return null

  await recordDocumentProcessingEvent({
    jobId: job.id,
    documentId: job.documentId,
    userId: job.userId,
    step: "started",
    message: `Document processing job started by ${workerId}`,
    meta: { attemptCount: job.attemptCount },
  })

  try {
    const result = await processDocument(
      job.documentId,
      job.userId,
      job.storagePath
    )

    if (!result) {
      const error = "processDocument returned null"
      await markDocumentJobFailed(job, error)
      return { job, ok: false, error }
    }

    await markDocumentJobSucceeded(job, {
      totalPages: result.totalPages,
      totalChunks: result.totalChunks,
      totalNodes: result.totalNodes,
      failedSections: result.failedSections,
    })
    return { job, ok: true }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    await markDocumentJobFailed(job, error)
    return { job, ok: false, error }
  }
}

export async function processDocumentJobs(args: {
  workerId: string
  limit: number
}) {
  const results: ProcessDocumentJobResult[] = []
  const limit = Math.max(1, Math.min(args.limit, 10))

  for (let i = 0; i < limit; i++) {
    const result = await processNextDocumentJob(args.workerId)
    if (!result) break
    results.push(result)
  }

  return {
    processed: results.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  }
}
