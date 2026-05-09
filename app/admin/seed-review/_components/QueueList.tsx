"use client"

import type { QueueNodeDto } from "@/lib/api/schemas/admin"
import { COPY } from "@/lib/ui/copy"

export interface QueueListProps {
  items: QueueNodeDto[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function QueueList({ items, selectedId, onSelect }: QueueListProps) {
  if (items.length === 0) {
    return <p className="px-4 py-6 text-xs text-black/45">{COPY.empty.noQueueItems}</p>
  }
  return (
    <ul className="flex-1 overflow-y-auto" data-testid="queue-list">
      {items.map((it) => {
        const isSelected = it.id === selectedId
        const typeLabel = it.type === "pattern" ? "유형" : "문제"
        return (
          <li key={it.id}>
            <button
              type="button"
              onClick={() => onSelect(it.id)}
              data-testid={`queue-item-${it.id}`}
              className={`flex w-full items-start gap-2 px-4 py-3 text-left transition ${
                isSelected ? "bg-black/[0.05]" : "hover:bg-black/[0.025]"
              }`}
            >
              <span
                className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  it.type === "pattern"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {typeLabel}
              </span>
              <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                <span className="truncate text-sm text-black/85">{it.label}</span>
                <span className="text-[11px] text-black/45">
                  {it.grade ?? "—"}
                  {it.itemSource ? ` · ${it.itemSource}` : ""}
                </span>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
