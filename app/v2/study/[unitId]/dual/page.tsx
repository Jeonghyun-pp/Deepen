/**
 * /v2/study/[unitId]/dual — 3-pane study 화면 (PDF + 그래프 + 코치).
 * Spec: docs/build-spec/08-q2-build.md M2.6 (B), 오르조 C.4 + Deepen 차별
 *       PDF 드래그 → 코치 호출.
 *
 * Q2 단순화:
 *   - PDF 직접 렌더 대신 chunks list (Q1 schema 활용). PDF.js 도입은 M3.x.
 *   - 첫 PDF (사용자 가장 최근 documents) 자동 선택.
 *   - 모바일은 탭 전환 (sm: 미만에서 PDF·그래프·코치 탭으로).
 */

import { redirect } from "next/navigation"
import Link from "next/link"
import { and, asc, desc, eq } from "drizzle-orm"
import { requireUser } from "@/lib/auth/require-user"
import { db } from "@/lib/db"
import { chunks, documents, nodes } from "@/lib/db/schema"
import { DualClient } from "./DualClient"

interface Props {
  params: Promise<{ unitId: string }>
  searchParams: Promise<{ doc?: string }>
}

export const dynamic = "force-dynamic"

export default async function DualPage({ params, searchParams }: Props) {
  await params
  const sp = await searchParams
  const { user } = await requireUser()

  // 사용자의 documents 중 첫 번째 (sp.doc 우선)
  let documentId: string | null = sp.doc ?? null
  if (!documentId) {
    const [first] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.userId, user.id),
          eq(documents.status, "ready"),
        ),
      )
      .orderBy(desc(documents.createdAt))
      .limit(1)
    documentId = first?.id ?? null
  }

  let chunkRows: { id: string; ordinal: number; sectionTitle: string | null; pageStart: number | null; content: string }[] = []
  let docTitle: string | null = null

  if (documentId) {
    const [doc] = await db
      .select({ title: documents.title })
      .from(documents)
      .where(
        and(eq(documents.id, documentId), eq(documents.userId, user.id)),
      )
      .limit(1)
    docTitle = doc?.title ?? null

    if (docTitle) {
      chunkRows = await db
        .select({
          id: chunks.id,
          ordinal: chunks.ordinal,
          sectionTitle: chunks.sectionTitle,
          pageStart: chunks.pageStart,
          content: chunks.content,
        })
        .from(chunks)
        .where(eq(chunks.documentId, documentId))
        .orderBy(asc(chunks.ordinal))
        .limit(200)
    }
  }

  // 첫 published item — 풀이 화면 진입용
  const [firstItem] = await db
    .select({ id: nodes.id })
    .from(nodes)
    .where(and(eq(nodes.type, "item"), eq(nodes.status, "published")))
    .orderBy(asc(nodes.createdAt))
    .limit(1)

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-zinc-50">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 bg-white px-6 py-3">
        <div className="flex flex-col">
          <Link
            href="/v2/study/default"
            className="text-[11px] uppercase tracking-widest text-black/45 hover:text-black/70"
          >
            ← 단원
          </Link>
          <h1 className="mt-0.5 text-sm font-semibold text-black/85">
            듀얼 모드
            {docTitle && (
              <span className="ml-2 text-xs font-normal text-black/55">
                · {docTitle}
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-black/55">
          {firstItem && (
            <Link
              href={`/v2/solve/${firstItem.id}`}
              className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-black/85"
            >
              풀이 시작 →
            </Link>
          )}
          <Link
            href="/upload"
            className="hover:text-black/85 hover:underline"
          >
            PDF 업로드
          </Link>
        </div>
      </header>

      <DualClient
        chunks={chunkRows}
        hasDocument={!!documentId}
        firstItemId={firstItem?.id ?? null}
      />
    </main>
  )
}
