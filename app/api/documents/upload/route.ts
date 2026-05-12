import { randomUUID } from "node:crypto"
import { after } from "next/server"
import { db } from "@/lib/db"
import { documents } from "@/lib/db/schema"
import { apiError, withAuth } from "@/lib/api/handler"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createDocumentJob } from "@/lib/pipeline/document-jobs"
import { processNextDocumentJob } from "@/lib/pipeline/document-job-runner"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60 // Vercel Hobby 한도 (Pro 시 300 복원 가능)

const MAX_FILE_BYTES = 30 * 1024 * 1024 // 30 MB

export const POST = withAuth("POST /api/documents/upload", async (request, { user }) => {
  const form = await request.formData()
  const file = form.get("file")
  if (!(file instanceof File)) return apiError.badRequest("file_required")
  if (!file.name.toLowerCase().endsWith(".pdf")) return apiError.badRequest("pdf_only")
  if (file.size > MAX_FILE_BYTES) return apiError.badRequest("file_too_large")

  const documentId = randomUUID()
  const storagePath = `${user.id}/${documentId}.pdf`

  const admin = createSupabaseAdminClient()
  const buffer = new Uint8Array(await file.arrayBuffer())
  const { error: upErr } = await admin.storage
    .from("documents")
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: false,
    })
  if (upErr) {
    console.error("[upload]", upErr)
    return Response.json(
      { error: "storage_upload_failed", detail: upErr.message },
      { status: 500 },
    )
  }

  const title = (form.get("title") as string | null)?.trim() || file.name

  const [created] = await db
    .insert(documents)
    .values({
      id: documentId,
      userId: user.id,
      title,
      storagePath,
      status: "uploaded",
    })
    .returning()

  // Queue the durable job first. after() only nudges processing after the
  // upload response, so a dropped serverless instance does not lose the job.
  await createDocumentJob({
    userId: user.id,
    documentId: created.id,
    storagePath,
    meta: { source: "upload" },
  })

  after(() =>
    processNextDocumentJob(`upload-after-${created.id}`).catch((e) => {
      console.error("[upload job nudge]", e)
    })
  )

  return Response.json(created, { status: 202 })
})
