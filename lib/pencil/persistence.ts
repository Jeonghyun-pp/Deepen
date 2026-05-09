/**
 * tldraw drawing snapshot ↔ Supabase Storage 동기화.
 * Spec: docs/build-spec/08-q2-build.md M2.1 — drawings/{userId}/{itemId}.json.
 *
 * 정책:
 *   - 클라 직접 업로드 (user JWT). RLS 정책으로 본인 폴더만 허용.
 *   - autosave debounce 2s — caller 가 onChange 콜백에서 debounce 적용.
 *   - JSON snapshot 사용 (PNG 별도). 다음 진입 시 editor.loadSnapshot.
 *
 * Q2 polish 후속:
 *   - 충돌 검출 (다른 탭/디바이스 동시 편집 — Q2 EXAM 모드부터 의식적 X)
 *   - draft history (rollback) — Q3+
 */

import type { TLEditorSnapshot } from "tldraw"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

const BUCKET = "drawings"

export function drawingPath(userId: string, itemId: string): string {
  return `${userId}/${itemId}.json`
}

export async function loadDrawingSnapshot(args: {
  userId: string
  itemId: string
}): Promise<TLEditorSnapshot | null> {
  const supabase = createSupabaseBrowserClient()
  const path = drawingPath(args.userId, args.itemId)
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error) {
    // 파일 없음(`Object not found` 404) 은 정상 — null 반환
    return null
  }
  try {
    const text = await data.text()
    return JSON.parse(text) as TLEditorSnapshot
  } catch {
    return null
  }
}

export async function saveDrawingSnapshot(args: {
  userId: string
  itemId: string
  snapshot: TLEditorSnapshot
}): Promise<void> {
  const supabase = createSupabaseBrowserClient()
  const path = drawingPath(args.userId, args.itemId)
  const blob = new Blob([JSON.stringify(args.snapshot)], {
    type: "application/json",
  })
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: true,
    contentType: "application/json",
  })
  if (error) {
    console.warn("[pencil.persistence] save 실패", error.message)
  }
}

export async function deleteDrawingSnapshot(args: {
  userId: string
  itemId: string
}): Promise<void> {
  const supabase = createSupabaseBrowserClient()
  const path = drawingPath(args.userId, args.itemId)
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) {
    console.warn("[pencil.persistence] delete 실패", error.message)
  }
}
