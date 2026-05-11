import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { documentJobs, documents } from "@/lib/db/schema"
import { withAuth } from "@/lib/api/handler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const GET = withAuth("GET /api/documents", async (_req, { user }) => {
  const [rows, jobs] = await Promise.all([
    db
      .select()
      .from(documents)
      .where(eq(documents.userId, user.id))
      .orderBy(desc(documents.createdAt)),
    db
      .select({
        id: documentJobs.id,
        documentId: documentJobs.documentId,
        status: documentJobs.status,
        attemptCount: documentJobs.attemptCount,
        maxAttempts: documentJobs.maxAttempts,
        errorMessage: documentJobs.errorMessage,
        updatedAt: documentJobs.updatedAt,
      })
      .from(documentJobs)
      .where(eq(documentJobs.userId, user.id))
      .orderBy(desc(documentJobs.createdAt)),
  ])

  const latestJobByDocumentId = new Map<string, (typeof jobs)[number]>()
  for (const job of jobs) {
    if (!latestJobByDocumentId.has(job.documentId)) {
      latestJobByDocumentId.set(job.documentId, job)
    }
  }

  return Response.json({
    documents: rows.map((doc) => ({
      ...doc,
      latestJob: latestJobByDocumentId.get(doc.id) ?? null,
    })),
  })
})
