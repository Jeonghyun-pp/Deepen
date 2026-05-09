"use client"

/**
 * 노드 검색 autocomplete — 어드민 EdgeSection 에서 prereq/contains 대상 선택.
 *
 * 동작:
 *   - debounce 200ms 후 /api/admin/nodes/search 호출
 *   - dropdown list 표시 (label + grade + type 배지 + status)
 *   - 키보드 ↑↓ 이동 / Enter 선택 / Esc 닫기
 *   - 선택 시 onSelect(node) 호출 + input 비움
 */

import { useCallback, useEffect, useRef, useState } from "react"
import type {
  NodeSearchHitDto,
  NodeSearchResponse,
} from "@/lib/api/schemas/admin"

export interface NodeSearchProps {
  type?: "pattern" | "item"
  excludeId?: string
  placeholder?: string
  onSelect: (node: NodeSearchHitDto) => void
}

const DEBOUNCE_MS = 200
const MIN_QUERY_FETCH = 0 // 빈 입력에서도 최근 N개 보여줌

export function NodeSearch({
  type,
  excludeId,
  placeholder,
  onSelect,
}: NodeSearchProps) {
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<NodeSearchHitDto[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchHits = useCallback(
    async (q: string) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ q, limit: "10" })
        if (type) params.set("type", type)
        if (excludeId) params.set("excludeId", excludeId)
        const res = await fetch(`/api/admin/nodes/search?${params}`, {
          credentials: "include",
        })
        if (!res.ok) {
          setHits([])
          return
        }
        const data = (await res.json()) as NodeSearchResponse
        setHits(data.hits)
        setActive(0)
      } finally {
        setLoading(false)
      }
    },
    [type, excludeId],
  )

  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < MIN_QUERY_FETCH) {
      void fetchHits("")
      return
    }
    debounceRef.current = setTimeout(() => {
      void fetchHits(query.trim())
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, open, fetchHits])

  // 외부 클릭 시 close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("mousedown", handleClick)
    return () => window.removeEventListener("mousedown", handleClick)
  }, [])

  const choose = (node: NodeSearchHitDto) => {
    onSelect(node)
    setQuery("")
    setHits([])
    setOpen(false)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((i) => Math.min(hits.length - 1, i + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (hits[active]) choose(hits[active])
    } else if (e.key === "Escape") {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={wrapRef} className="relative" data-testid="node-search">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          setOpen(true)
          if (hits.length === 0) void fetchHits(query.trim())
        }}
        onKeyDown={handleKey}
        placeholder={
          placeholder ??
          (type === "pattern"
            ? "Pattern 검색 (라벨/학년)"
            : type === "item"
              ? "Item 검색 (라벨/출처)"
              : "노드 검색")
        }
        className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/40"
        data-testid="node-search-input"
        aria-autocomplete="list"
        aria-expanded={open}
      />

      {open && (
        <div
          className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-md border border-black/10 bg-white shadow-lg"
          role="listbox"
          data-testid="node-search-dropdown"
        >
          {loading && hits.length === 0 && (
            <p className="px-3 py-2 text-xs text-black/45">검색 중…</p>
          )}
          {!loading && hits.length === 0 && (
            <p className="px-3 py-2 text-xs text-black/45">결과 없음</p>
          )}
          {hits.map((hit, idx) => {
            const isActive = idx === active
            return (
              <button
                key={hit.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(hit)
                }}
                onMouseEnter={() => setActive(idx)}
                data-testid={`node-search-hit-${hit.id}`}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm ${
                  isActive ? "bg-black/[0.05]" : "hover:bg-black/[0.025]"
                }`}
              >
                <span
                  className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    hit.type === "pattern"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {hit.type === "pattern" ? "유형" : "문제"}
                </span>
                <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                  <span className="truncate text-black/85">{hit.label}</span>
                  <span className="text-[11px] text-black/45">
                    {[hit.grade, hit.itemSource].filter(Boolean).join(" · ") ||
                      "—"}
                  </span>
                </div>
                {hit.status === "draft" && (
                  <span className="ml-1 mt-0.5 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-700">
                    draft
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
