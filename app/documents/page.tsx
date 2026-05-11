"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"

interface DocumentRow {
  id: string
  title: string
  status: "uploaded" | "parsing" | "extracting" | "ready" | "failed"
  errorMessage: string | null
  pageCount: number | null
  createdAt: string
  latestJob: {
    id: string
    status: "queued" | "running" | "succeeded" | "failed" | "canceled"
    attemptCount: number
    maxAttempts: number
    errorMessage: string | null
  } | null
}

const STATUS_LABEL: Record<DocumentRow["status"], string> = {
  uploaded: "업로드됨",
  parsing: "파싱 중",
  extracting: "노드 추출 중",
  ready: "완료",
  failed: "실패",
}

const STATUS_COLOR: Record<DocumentRow["status"], string> = {
  uploaded: "text-neutral-500",
  parsing: "text-blue-600",
  extracting: "text-blue-600",
  ready: "text-green-700",
  failed: "text-red-600",
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/documents", { credentials: "include" })
      if (res.status === 401) {
        window.location.href =
          "/login?redirect=" + encodeURIComponent("/documents")
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const raw = (await res.json()) as { documents: DocumentRow[] }
      setDocs(raw.documents)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = useCallback(
    async (id: string, title: string) => {
      if (
        !window.confirm(
          `"${title}" 문서를 삭제할까요?\n이 문서에만 연결된 노드와 엣지도 함께 삭제됩니다.`,
        )
      ) {
        return
      }
      setBusyId(id)
      try {
        const res = await fetch(`/api/documents/${id}`, {
          method: "DELETE",
          credentials: "include",
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        await load()
      } catch (e) {
        alert(`삭제 실패: ${e instanceof Error ? e.message : String(e)}`)
      } finally {
        setBusyId(null)
      }
    },
    [load],
  )

  const handleRetry = useCallback(
    async (jobId: string) => {
      setBusyId(jobId)
      try {
        const res = await fetch(`/api/document-jobs/${jobId}/retry`, {
          method: "POST",
          credentials: "include",
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        await load()
      } catch (e) {
        alert(`재시도 실패: ${e instanceof Error ? e.message : String(e)}`)
      } finally {
        setBusyId(null)
      }
    },
    [load],
  )

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="max-w-3xl mx-auto p-3 md:p-6 space-y-3">
        <header className="rounded-2xl shadow-sm bg-white px-6 py-4 flex items-center justify-between">
          <h1 className="text-base font-semibold">내 문서</h1>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/upload" className="text-neutral-700 underline">
              업로드
            </Link>
            <Link href="/graph" className="text-neutral-600 underline">
              그래프
            </Link>
          </div>
        </header>

        <div className="rounded-2xl shadow-sm bg-white px-6 py-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              로드 실패: {error}
            </div>
          )}

          {docs === null && !error && (
            <div className="text-sm text-neutral-500">불러오는 중...</div>
          )}

          {docs && docs.length === 0 && (
            <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center">
              <p className="text-neutral-600 text-sm mb-3">
                아직 업로드한 문서가 없습니다.
              </p>
              <Link
                href="/upload"
                className="inline-block text-sm underline text-neutral-900"
              >
                첫 문서 업로드하기
              </Link>
            </div>
          )}

          {docs && docs.length > 0 && (
            <ul className="divide-y divide-neutral-200">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{d.title}</div>
                    <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-2">
                      <span className={STATUS_COLOR[d.status]}>
                        {STATUS_LABEL[d.status]}
                      </span>
                      {d.pageCount != null && <span>· {d.pageCount}쪽</span>}
                      <span>
                        · {new Date(d.createdAt).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    {d.status === "failed" && d.errorMessage && (
                      <div className="text-xs text-red-600 mt-1 truncate">
                        {d.errorMessage}
                      </div>
                    )}
                    {d.latestJob && d.latestJob.status !== "succeeded" && (
                      <div className="text-xs text-neutral-500 mt-1 truncate">
                        job: {d.latestJob.status} ({d.latestJob.attemptCount}/
                        {d.latestJob.maxAttempts})
                        {d.latestJob.errorMessage
                          ? ` - ${d.latestJob.errorMessage}`
                          : ""}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 shrink-0 flex items-center gap-3">
                    {d.latestJob?.status === "failed" && (
                      <button
                        onClick={() => handleRetry(d.latestJob!.id)}
                        disabled={busyId === d.latestJob.id}
                        className="text-xs text-blue-600 hover:text-blue-800 disabled:text-neutral-400"
                      >
                        {busyId === d.latestJob.id ? "재시도 중..." : "재시도"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(d.id, d.title)}
                      disabled={busyId === d.id}
                      className="text-xs text-red-600 hover:text-red-800 disabled:text-neutral-400"
                    >
                      {busyId === d.id ? "삭제 중..." : "삭제"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
