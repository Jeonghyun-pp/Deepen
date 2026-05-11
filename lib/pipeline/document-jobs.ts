import { and, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  documentJobs,
  documentProcessingEvents,
  documents,
  type DocumentJob,
} from "@/lib/db/schema"

export type DocumentJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled"

export interface ClaimedDocumentJob {
  id: string
  userId: string
  documentId: string
  type: string
  status: DocumentJobStatus
  attemptCount: number
  maxAttempts: number
  lockedAt: Date | null
  lockedBy: string | null
  storagePath: string
}

type JobRow = {
  id: string
  user_id: string
  document_id: string
  type: string
  status: DocumentJobStatus
  attempt_count: number
  max_attempts: number
  locked_at: Date | null
  locked_by: string | null
  storage_path: string
}

function toClaimedJob(row: JobRow): ClaimedDocumentJob {
  return {
    id: row.id,
    userId: row.user_id,
    documentId: row.document_id,
    type: row.type,
    status: row.status,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    lockedAt: row.locked_at,
    lockedBy: row.locked_by,
    storagePath: row.storage_path,
  }
}

export async function createDocumentJob(args: {
  userId: string
  documentId: string
  storagePath: string
  meta?: Record<string, unknown>
}): Promise<DocumentJob> {
  const [job] = await db
    .insert(documentJobs)
    .values({
      userId: args.userId,
      documentId: args.documentId,
      status: "queued",
      meta: {
        storagePath: args.storagePath,
        ...(args.meta ?? {}),
      },
    })
    .returning()

  await recordDocumentProcessingEvent({
    jobId: job.id,
    documentId: args.documentId,
    userId: args.userId,
    step: "queued",
    message: "Document processing job queued",
  })

  return job
}

export async function recordDocumentProcessingEvent(args: {
  jobId: string
  documentId: string
  userId: string
  step: string
  message: string
  level?: "info" | "warn" | "error"
  meta?: Record<string, unknown>
}) {
  await db.insert(documentProcessingEvents).values({
    jobId: args.jobId,
    documentId: args.documentId,
    userId: args.userId,
    step: args.step,
    level: args.level ?? "info",
    message: args.message,
    meta: args.meta ?? null,
  })
}

export async function claimNextDocumentJob(
  workerId: string
): Promise<ClaimedDocumentJob | null> {
  const rows = (await db.execute<JobRow>(sql`
    with next_job as (
      select j.id
      from document_jobs j
      where j.status = 'queued'
        and j.next_run_at <= now()
      order by j.created_at asc
      for update skip locked
      limit 1
    )
    update document_jobs j
       set status = 'running',
           locked_at = now(),
           locked_by = ${workerId},
           started_at = coalesce(j.started_at, now()),
           attempt_count = j.attempt_count + 1,
           updated_at = now(),
           error_message = null
      from next_job, documents d
     where j.id = next_job.id
       and d.id = j.document_id
    returning
      j.id,
      j.user_id,
      j.document_id,
      j.type,
      j.status,
      j.attempt_count,
      j.max_attempts,
      j.locked_at,
      j.locked_by,
      d.storage_path
  `)) as unknown as JobRow[]

  if (!rows[0]) return null
  return toClaimedJob(rows[0])
}

export async function markDocumentJobSucceeded(
  job: ClaimedDocumentJob,
  meta?: Record<string, unknown>
) {
  await db
    .update(documentJobs)
    .set({
      status: "succeeded",
      lockedAt: null,
      lockedBy: null,
      finishedAt: new Date(),
      updatedAt: new Date(),
      errorMessage: null,
    })
    .where(eq(documentJobs.id, job.id))

  await recordDocumentProcessingEvent({
    jobId: job.id,
    documentId: job.documentId,
    userId: job.userId,
    step: "succeeded",
    message: "Document processing job succeeded",
    meta,
  })
}

export async function markDocumentJobFailed(
  job: ClaimedDocumentJob,
  errorMessage: string
) {
  await db
    .update(documentJobs)
    .set({
      status: "failed",
      lockedAt: null,
      lockedBy: null,
      finishedAt: new Date(),
      updatedAt: new Date(),
      errorMessage,
    })
    .where(eq(documentJobs.id, job.id))

  await recordDocumentProcessingEvent({
    jobId: job.id,
    documentId: job.documentId,
    userId: job.userId,
    step: "failed",
    level: "error",
    message: errorMessage,
  })
}

export async function retryDocumentJob(args: {
  jobId: string
  userId: string
}) {
  const [job] = await db
    .update(documentJobs)
    .set({
      status: "queued",
      lockedAt: null,
      lockedBy: null,
      finishedAt: null,
      nextRunAt: new Date(),
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(and(eq(documentJobs.id, args.jobId), eq(documentJobs.userId, args.userId)))
    .returning()

  if (!job) return null

  await db
    .update(documents)
    .set({ status: "uploaded", errorMessage: null })
    .where(
      and(
        eq(documents.id, job.documentId),
        eq(documents.userId, args.userId)
      )
    )

  await recordDocumentProcessingEvent({
    jobId: job.id,
    documentId: job.documentId,
    userId: args.userId,
    step: "requeued",
    message: "Document processing job requeued",
  })

  return job
}
