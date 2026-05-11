import { retryDocumentJob } from "@/lib/pipeline/document-jobs"
import { apiError, withAuth } from "@/lib/api/handler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const POST = withAuth<{ id: string }>(
  "POST /api/document-jobs/[id]/retry",
  async (_request, { user, params }) => {
    const job = await retryDocumentJob({ jobId: params.id, userId: user.id })
    if (!job) return apiError.notFound("job_not_found")
    return Response.json({ job })
  }
)
