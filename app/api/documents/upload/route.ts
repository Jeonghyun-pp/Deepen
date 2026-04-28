import { randomUUID } from "node:crypto"
import { after } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { documents } from "@/lib/db/schema"
import { apiError, withAuth } from "@/lib/api/handler"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { processDocument } from "@/lib/pipeline/process-document"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300 // Vercel 배포 시 백그라운드 여유

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

  // 백그라운드 처리 — Next.js after()로 응답 이후 실행 (Vercel serverless 호환).
  // after()는 콜백이 반환한 Promise를 waitUntil로 연장한다.
  after(() => runPipeline(created.id, user.id, storagePath))

  return Response.json(created, { status: 202 })
})

function runPipeline(documentId: string, userId: string, storagePath: string) {
  return processDocument(documentId, userId, storagePath).catch(async (e) => {
    console.error("[runPipeline] fatal:", e)
    await db
      .update(documents)
      .set({
        status: "failed",
        errorMessage: e instanceof Error ? e.message : String(e),
      })
      .where(eq(documents.id, documentId))
      .catch(() => {})
  })
}
