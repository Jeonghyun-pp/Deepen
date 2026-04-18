"use client"

import { useCallback, useEffect, useState } from "react"
import UploadDropzone from "./UploadDropzone"
import type { Document } from "@/lib/db/schema"

const POLL_INTERVAL_MS = 2000
const STATUS_LABEL: Record<string, string> = {
  uploaded: "업로드됨",
  parsing: "PDF 분석 중",
  extracting: "개념 추출 중",
  ready: "완료",
  failed: "실패",
}

export default function UploadPanel({
  compact = false,
  onDocumentReady,
}: {
  compact?: boolean
  /** 문서 하나가 처음으로 ready 상태가 됐을 때 호출 — 그래프 refetch 훅 */
  onDocumentReady?: (doc: Document) => void
}) {
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/documents", { credentials: "include" })
      if (res.status === 401) {
        window.location.href =
          "/login?redirect=" + encodeURIComponent(window.location.pathname)
        return
      }
      if (!res.ok) return
      const data = await res.json()
      setDocs((prev) => {
        if (onDocumentReady) {
          const prevIds = new Map(prev.map((d) => [d.id, d.status]))
          for (const d of data.documents ?? []) {
            if (d.status === "ready" && prevIds.get(d.id) !== "ready") {
              onDocumentReady(d)
            }
          }
        }
        return data.documents ?? []
      })
    } finally {
      setLoading(false)
    }
  }, [onDocumentReady])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const hasInFlight = docs.some(
      (d) =>
        d.status === "uploaded" ||
        d.status === "parsing" ||
        d.status === "extracting"
    )
    if (!hasInFlight) return
    const t = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(t)
  }, [docs, refresh])

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      <UploadDropzone onUploaded={refresh} compact={compact} />

      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-neutral-600">최근 업로드</h2>
        {loading ? (
          <p className="text-xs text-neutral-500">불러오는 중...</p>
        ) : docs.length === 0 ? (
          <p className="text-xs text-neutral-500">
            아직 업로드한 문서가 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100 rounded border border-neutral-200">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between px-3 py-2 gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs truncate" title={d.title}>
                    {d.title}
                  </p>
                  {d.errorMessage && d.status === "failed" && (
                    <p className="text-[10px] text-red-600 truncate">
                      {d.errorMessage}
                    </p>
                  )}
                </div>
                <StatusBadge status={d.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "ready"
      ? "bg-green-100 text-green-800"
      : status === "failed"
        ? "bg-red-100 text-red-700"
        : "bg-neutral-100 text-neutral-700"
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${color}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}
