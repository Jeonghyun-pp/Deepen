"use client"

/**
 * 시드 검수 화면 — list + 편집 split view.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import type {
  EdgeDto,
  NodeDetailResponse,
  QueueNodeDto,
  SeedQueueResponse,
} from "@/lib/api/schemas/admin"
import { QueueList } from "./_components/QueueList"
import { NodeEditor } from "./_components/NodeEditor"

type StatusFilter = "draft" | "published"
type TypeFilter = "all" | "pattern" | "item"

export function SeedReviewClient() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("draft")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [queue, setQueue] = useState<QueueNodeDto[]>([])
  const [total, setTotal] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<NodeDetailResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const refreshQueue = useCallback(async () => {
    const params = new URLSearchParams({
      status: statusFilter,
      limit: "100",
    })
    if (typeFilter !== "all") params.set("type", typeFilter)
    const res = await fetch(`/api/admin/seed/queue?${params}`, {
      credentials: "include",
    })
    if (!res.ok) return
    const data = (await res.json()) as SeedQueueResponse
    setQueue(data.items)
    setTotal(data.total)
  }, [statusFilter, typeFilter])

  const refreshDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/nodes/${id}`, {
      credentials: "include",
    })
    if (!res.ok) {
      setDetail(null)
      return
    }
    const data = (await res.json()) as NodeDetailResponse
    setDetail(data)
  }, [])

  useEffect(() => {
    refreshQueue()
  }, [refreshQueue])

  useEffect(() => {
    if (selectedId) refreshDetail(selectedId)
    else setDetail(null)
  }, [selectedId, refreshDetail])

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handlePatch = async (
    id: string,
    patch: Record<string, unknown>,
  ): Promise<boolean> => {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/nodes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        flash(`수정 실패: ${err.error ?? res.status}`)
        return false
      }
      await refreshDetail(id)
      await refreshQueue()
      flash("저장됨")
      return true
    } finally {
      setBusy(false)
    }
  }

  const handlePublish = async (id: string) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/nodes/${id}/publish`, {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) {
        const err = (await res.json()) as {
          error?: string
          missing?: string[]
        }
        if (err.missing && err.missing.length > 0) {
          flash(`필수 누락: ${err.missing.join(", ")}`)
        } else {
          flash(`퍼블리시 실패: ${err.error ?? res.status}`)
        }
        return
      }
      flash("Publish 완료")
      await refreshQueue()
      setSelectedId(null)
    } finally {
      setBusy(false)
    }
  }

  const handleDiscard = async (id: string) => {
    if (!confirm("정말 삭제할까요? draft 만 삭제됩니다.")) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/nodes/${id}/discard`, {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        flash(`삭제 실패: ${err.error ?? res.status}`)
        return
      }
      flash("삭제됨")
      await refreshQueue()
      setSelectedId(null)
    } finally {
      setBusy(false)
    }
  }

  const handleAddEdge = async (args: {
    sourceNodeId: string
    targetNodeId: string
    type: "prerequisite" | "contains"
  }) => {
    setBusy(true)
    try {
      const res = await fetch("/api/admin/edges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(args),
      })
      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        flash(`엣지 추가 실패: ${err.error ?? res.status}`)
        return
      }
      flash("엣지 추가됨")
      if (selectedId) await refreshDetail(selectedId)
    } finally {
      setBusy(false)
    }
  }

  const handleRemoveEdge = async (edgeId: string) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/edges/${edgeId}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        flash(`엣지 삭제 실패: ${err.error ?? res.status}`)
        return
      }
      flash("엣지 삭제됨")
      if (selectedId) await refreshDetail(selectedId)
    } finally {
      setBusy(false)
    }
  }

  const handleCreate = async (type: "pattern" | "item") => {
    setBusy(true)
    try {
      const placeholder =
        type === "pattern" ? "새 유형 (라벨 수정)" : "새 문제 (본문 입력)"
      const res = await fetch("/api/admin/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type,
          label: placeholder,
          ...(type === "pattern" ? { displayLayer: "pattern" } : {}),
        }),
      })
      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        flash(`생성 실패: ${err.error ?? res.status}`)
        return
      }
      const data = (await res.json()) as {
        node: { id: string }
      }
      // 새로 만든 draft 가 큐 맨 앞에 들어오도록 status 'draft' 강제
      setStatusFilter("draft")
      setTypeFilter(type)
      await refreshQueue()
      setSelectedId(data.node.id)
      flash(`${type === "pattern" ? "Pattern" : "Item"} 생성됨 — 라벨 수정`)
    } finally {
      setBusy(false)
    }
  }

  const counts = useMemo(() => {
    const total = queue.length
    const patternCount = queue.filter((q) => q.type === "pattern").length
    const itemCount = total - patternCount
    return { total, pattern: patternCount, item: itemCount }
  }, [queue])

  return (
    <main className="grid h-screen grid-cols-1 overflow-hidden md:grid-cols-[380px_1fr]">
      <aside className="flex flex-col border-r border-black/5 bg-zinc-50">
        <header className="border-b border-black/5 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-semibold text-black/85">
              시드 검수 — Q1 임시
            </h1>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => handleCreate("pattern")}
                disabled={busy}
                data-testid="create-pattern"
                className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-40"
                aria-label="새 Pattern 생성"
              >
                + 유형
              </button>
              <button
                type="button"
                onClick={() => handleCreate("item")}
                disabled={busy}
                data-testid="create-item"
                className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-40"
                aria-label="새 Item 생성"
              >
                + 문제
              </button>
            </div>
          </div>
          <p className="mt-1 text-[11px] text-black/55">
            보이는 항목 {counts.total}개 (Pattern {counts.pattern} · Item {counts.item}) / 전체 {total}개
          </p>
        </header>

        <div className="flex gap-1.5 border-b border-black/5 px-4 py-2 text-xs">
          {(["draft", "published"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded px-2 py-1 ${
                statusFilter === s ? "bg-black text-white" : "text-black/60"
              }`}
            >
              {s === "draft" ? "검수 대기" : "발행됨"}
            </button>
          ))}
          <span className="mx-2 text-black/30">|</span>
          {(["all", "pattern", "item"] as TypeFilter[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`rounded px-2 py-1 ${
                typeFilter === t ? "bg-black/85 text-white" : "text-black/60"
              }`}
            >
              {t === "all" ? "전체" : t === "pattern" ? "유형" : "문제"}
            </button>
          ))}
        </div>

        <QueueList
          items={queue}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </aside>

      <section className="overflow-y-auto bg-white px-6 py-6">
        {detail ? (
          <NodeEditor
            key={detail.node.id}
            detail={detail}
            busy={busy}
            onPatch={handlePatch}
            onPublish={handlePublish}
            onDiscard={handleDiscard}
            onAddEdge={(e) => handleAddEdge(e)}
            onRemoveEdge={handleRemoveEdge}
          />
        ) : (
          <p className="text-sm text-black/55">왼쪽에서 검수할 노드를 선택하세요.</p>
        )}
      </section>

      {toast && (
        <div
          className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black px-4 py-2 text-xs text-white shadow-lg"
          data-testid="seed-toast"
        >
          {toast}
        </div>
      )}
    </main>
  )
}
