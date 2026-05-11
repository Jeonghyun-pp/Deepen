/**
 * tldraw drawing → PNG base64.
 * Spec: docs/build-spec/08-q2-build.md M2.1 — longer side 1600px, ≤4MB.
 *
 * 흐름:
 *   1. editor 의 모든 shape 를 PNG blob 으로 export.
 *   2. canvas 에 다시 그려 longer side 1600px 로 clamp.
 *   3. base64 변환 후 size 검증.
 *
 * tldraw v5 export API:
 *   import { exportToBlob } from 'tldraw'
 *   exportToBlob({ editor, ids, format: 'png', opts: { background: false } })
 */

import type { Editor, TLShapeId } from "tldraw"
import { EXPORT_MAX_BYTES, EXPORT_MAX_DIMENSION } from "./tools-config"

export class ExportTooLargeError extends Error {
  constructor(public bytes: number) {
    super(`export_too_large (${bytes} bytes)`)
    this.name = "ExportTooLargeError"
  }
}

export class ExportEmptyError extends Error {
  constructor() {
    super("export_empty")
    this.name = "ExportEmptyError"
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = src
  })
}

/**
 * data URL 또는 raw base64 문자열의 디코딩 후 byte size 계산.
 * 단위 테스트 위해 export.
 */
export function base64ByteSize(dataUrl: string): number {
  // data:image/png;base64,XXXX
  const comma = dataUrl.indexOf(",")
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  // base64 1 char = 6 bit, 4 chars = 3 bytes. padding 보정.
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0
  return Math.floor((base64.length * 3) / 4) - padding
}

/**
 * @param shapeIds 명시 지정 시 해당 shape 만 export. 미지정 시 페이지 전체 (기존 동작).
 *                 PdfPenCanvas 처럼 PDF image shape 가 페이지에 있는 경우 잉크 id 만 골라 넘기는 용도.
 */
export async function exportDrawingToPng(
  editor: Editor,
  shapeIds?: TLShapeId[],
): Promise<string> {
  const ids = shapeIds ?? [...editor.getCurrentPageShapeIds()]
  if (ids.length === 0) throw new ExportEmptyError()

  // tldraw v5: editor.toImage(shapes, opts) → { blob, width, height }
  const { blob } = await editor.toImage(ids, {
    format: "png",
    background: false,
    padding: 16,
  })

  const url = URL.createObjectURL(blob)
  let dataUrl: string
  try {
    const img = await loadImage(url)
    const longer = Math.max(img.width, img.height)
    const scale =
      longer > EXPORT_MAX_DIMENSION ? EXPORT_MAX_DIMENSION / longer : 1
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(img.width * scale))
    canvas.height = Math.max(1, Math.round(img.height * scale))
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("no_canvas_ctx")
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    dataUrl = canvas.toDataURL("image/png")
  } finally {
    URL.revokeObjectURL(url)
  }

  const bytes = base64ByteSize(dataUrl)
  if (bytes > EXPORT_MAX_BYTES) {
    throw new ExportTooLargeError(bytes)
  }
  return dataUrl
}
