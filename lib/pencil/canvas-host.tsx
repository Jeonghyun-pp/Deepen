"use client"

/**
 * tldraw editor mount + 외부 ref 노출.
 *
 * Spec: docs/build-spec/08-q2-build.md M2.1.
 * Q1 (M2.1) 범위:
 *   - mount 시 editor 인스턴스를 콜백으로 전달
 *   - pen-only 모드 (모바일 손바닥 인식 방지) 강제 안 함 — Q2 polish
 *   - persistence (Storage 동기화) 는 후속 작업으로
 *
 * tldraw v5 API: <Tldraw onMount={(editor) => ...} />
 */

import type { Editor } from "tldraw"
import { Tldraw } from "tldraw"
import "tldraw/tldraw.css"

export interface PencilCanvasHostProps {
  /** mount 시점에 호출 — caller 가 editor 를 ref 로 보관. */
  onMount?: (editor: Editor) => void
  /** drawing 변경 시 호출 — debounced autosave 용 (Q2 polish 시점에 사용). */
  onChange?: (editor: Editor) => void
}

export function PencilCanvasHost({
  onMount,
  onChange,
}: PencilCanvasHostProps) {
  return (
    <Tldraw
      hideUi={false}
      onMount={(editor) => {
        // pen-only 모드 (Apple Pencil 우선) — 모바일 손가락 입력 무시.
        // editor.user.updateUserPreferences({ ... })
        // tldraw v5 user preferences API 가 변동될 수 있어 일단 mount 콜백만.
        onMount?.(editor)
        if (onChange) {
          editor.store.listen(() => onChange(editor), {
            scope: "document",
            source: "user",
          })
        }
      }}
    />
  )
}
