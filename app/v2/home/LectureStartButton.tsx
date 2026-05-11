"use client"

/**
 * LectureStartButton — home footer 의 강의안 학습 시작 버튼 (북극성 Stage 2).
 * Spec: docs/north-star-spec-2026-05-11.md
 *
 * 클릭 시 POST /api/lecture/create → lectureId 받아 /v2/lecture/[id] 로 push.
 * documentId 가 없으면 /upload 로 가는 stub link 만 표시.
 */

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export interface LectureStartButtonProps {
  readyDocumentId: string | null
}

export function LectureStartButton({ readyDocumentId }: LectureStartButtonProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!readyDocumentId) {
    return (
      <Link
        href="/upload"
        className="hover:text-black/80 hover:underline"
        data-testid="lecture-no-doc"
      >
        강의안 학습 (PDF 필요)
      </Link>
    )
  }

  const handleClick = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/lecture/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ documentId: readyDocumentId }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setError(j.error ?? `http_${res.status}`)
        return
      }
      const data = (await res.json()) as { lectureId: string }
      router.push(`/v2/lecture/${data.lectureId}`)
    } catch (e) {
      setError((e as Error).message ?? "network_error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      data-testid="lecture-start"
      className="hover:text-black/80 hover:underline disabled:opacity-50"
    >
      {busy ? "준비 중…" : "강의안 학습 시작"}
      {error && (
        <span className="ml-1 text-rose-600">· {error}</span>
      )}
    </button>
  )
}
