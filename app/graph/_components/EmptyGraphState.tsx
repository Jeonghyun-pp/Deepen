"use client"

import { useState } from "react"
import Link from "next/link"
import type { GraphNode, NodeType } from "../_data/types"
import { dbNodeToGraphNode } from "@/lib/graph/mappers"

const NODE_TYPES: { value: NodeType; label: string }[] = [
  { value: "concept", label: "개념" },
  { value: "technique", label: "기법" },
  { value: "application", label: "응용" },
  { value: "question", label: "질문" },
  { value: "memo", label: "메모" },
  { value: "paper", label: "논문" },
  { value: "document", label: "문서" },
]

export default function EmptyGraphState({
  onNodeAdded,
}: {
  onNodeAdded: (node: GraphNode) => void
}) {
  const [label, setLabel] = useState("")
  const [type, setType] = useState<NodeType>("concept")
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = label.trim()
    if (!trimmed) return

    setStatus("saving")
    setError("")
    try {
      const res = await fetch("/api/nodes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: trimmed, type }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const created = await res.json()
      onNodeAdded(dbNodeToGraphNode(created))
      setLabel("")
      setStatus("idle")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus("error")
    }
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 pointer-events-auto">
      <form
        onSubmit={handleSubmit}
        className="w-80 space-y-3 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"
      >
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">그래프가 비어있습니다</h2>
          <p className="text-xs text-neutral-500">
            PDF를 업로드해 자동으로 노드를 생성하거나, 아래에서 수동으로 추가할 수 있습니다.
          </p>
        </div>

        <Link
          href="/upload"
          className="block w-full rounded border border-neutral-300 bg-white px-3 py-1.5 text-center text-sm hover:border-neutral-900"
        >
          PDF 업로드로 시작하기 →
        </Link>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-neutral-400">또는 수동으로</span>
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-neutral-600">라벨</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="예: Bayes' Theorem"
            disabled={status === "saving"}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-neutral-600">타입</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as NodeType)}
            disabled={status === "saving"}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
          >
            {NODE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={status === "saving" || !label.trim()}
          className="w-full rounded bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {status === "saving" ? "저장 중..." : "노드 추가"}
        </button>

        {status === "error" && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </form>
    </div>
  )
}
