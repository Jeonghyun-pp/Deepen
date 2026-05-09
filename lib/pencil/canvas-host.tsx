"use client"

/**
 * tldraw editor mount + 외부 ref 노출 + snapshot 복원/구독.
 *
 * Spec: docs/build-spec/08-q2-build.md M2.1.
 *
 * tldraw v5 API: <Tldraw onMount={(editor) => ...} />
 *               loadSnapshot(editor.store, snapshot) 로 복원.
 *               editor.store.listen(...) 으로 변경 구독.
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
      hideUi={false}
      onMount={(editor) => {
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
