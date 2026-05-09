"use client"

/**
 * 펜슬 툴바 — 색·굵기 토글 + clear + export.
 * Spec: docs/build-spec/08-q2-build.md M2.1.
 *
 * tldraw 자체 UI 가 있지만 학생 친화 (한국어 라벨 + 큰 hit target) 위해
 * 우리 별도 툴바를 위에 둔다.
 */

import {
  PEN_COLORS,
  PEN_SIZES,
  type PenColorKey,
  type PenSizeKey,
} from "@/lib/pencil/tools-config"

export interface PencilToolbarProps {
  color: PenColorKey
  size: PenSizeKey
  busy?: boolean
  onColorChange: (c: PenColorKey) => void
  onSizeChange: (s: PenSizeKey) => void
  onClear: () => void
  onExport: () => void
}

export function PencilToolbar({
  color,
  size,
  busy,
  onColorChange,
  onSizeChange,
  onClear,
  onExport,
}: PencilToolbarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-black/5 bg-white px-3 py-2"
      role="toolbar"
      aria-label="펜슬 툴바"
      data-testid="pencil-toolbar"
    >
      <div className="flex items-center gap-1">
        {PEN_COLORS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onColorChange(c.key)}
            data-testid={`pen-color-${c.key}`}
            aria-label={`색 ${c.label}`}
            className={`h-6 w-6 rounded-full border-2 transition ${
              color === c.key
                ? "border-black/65 ring-2 ring-black/20"
                : "border-black/15 hover:border-black/40"
            }`}
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>

      <div className="ml-2 flex items-center gap-1">
        {PEN_SIZES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onSizeChange(s.key)}
            data-testid={`pen-size-${s.key}`}
            aria-label={`굵기 ${s.label}`}
            className={`flex h-7 w-7 items-center justify-center rounded ${
              size === s.key
                ? "bg-black/[0.08]"
                : "hover:bg-black/[0.03]"
            }`}
          >
            <span
              className="rounded-full bg-black/85"
              style={{ width: `${s.px}px`, height: `${s.px}px` }}
            />
          </button>
        ))}
      </div>

      <span className="flex-1" />

      <button
        type="button"
        onClick={onClear}
        disabled={busy}
        data-testid="pencil-clear"
        className="rounded-md border border-black/10 bg-white px-2.5 py-1 text-xs text-black/70 hover:bg-black/[0.03] disabled:opacity-40"
      >
        지우기
      </button>
      <button
        type="button"
        onClick={onExport}
        disabled={busy}
        data-testid="pencil-export"
        className="rounded-md bg-black px-2.5 py-1 text-xs font-medium text-white hover:bg-black/85 disabled:opacity-40"
      >
        풀이 첨부
      </button>
    </div>
  )
}
