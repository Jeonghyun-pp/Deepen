"use client"

/**
 * tldraw editor mount + 외부 ref 노출 + snapshot 복원/구독.
 *
 * Spec: docs/build-spec/08-q2-build.md M2.1.
 *
 * tldraw v5 API: <Tldraw onMount={(editor) => ...} />
 *               loadSnapshot(editor.store, snapshot) 로 복원.
 *               editor.store.listen(...) 으로 변경 구독.
 *
 * Phase 4 Path B (2026-05-11): hideUi=true + 마운트 시 'draw' 도구 강제.
 *   tldraw 자체 toolbar/패널 숨기고 우리 PencilToolbar 만 노출 — 워크스페이스 시각 일관성.
 */

import type { Editor, TLEditorSnapshot } from "tldraw"
import { Tldraw, loadSnapshot } from "tldraw"
import "tldraw/tldraw.css"

export interface PencilCanvasHostProps {
  /** mount 시점에 호출 — caller 가 editor 를 ref 로 보관. */
  onMount?: (editor: Editor) => void
  /** drawing 변경 시 호출 — debounced autosave 용. */
  onChange?: (editor: Editor) => void
  /** 이전 세션 drawing 자동 복원. */
  initialSnapshot?: TLEditorSnapshot | null
}

export function PencilCanvasHost({
  onMount,
  onChange,
  initialSnapshot,
}: PencilCanvasHostProps) {
  return (
    <Tldraw
      hideUi
      onMount={(editor) => {
        // Phase 4 Path B: 'draw' 도구 강제 (선택/이동/줌 도구 노출 X).
        // 사용자는 우리 PencilToolbar 의 색·굵기·undo·redo·clear 만 사용.
        editor.setCurrentTool("draw")

        if (initialSnapshot) {
          try {
            loadSnapshot(editor.store, initialSnapshot)
          } catch (e) {
            console.warn("[pencil.canvas-host] snapshot 복원 실패", e)
          }
        }
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
