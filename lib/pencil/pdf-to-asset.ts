"use client"

/**
 * PDF 페이지 → 비트맵 PNG dataURL 렌더 유틸.
 *
 * 배경: 기존 `PdfPageViewer` 는 react-pdf 캔버스 위에 tldraw 캔버스를 `absolute` 로 얹어
 *   두 GPU 레이어 / 두 페인트 클럭 / 두 transform 으로 갈라져 "잉크가 PDF 위에 안 놓이고
 *   떠 있는" 분리감을 만들었다 (Goodnotes/web.dev case study 참고:
 *   https://web.dev/case-studies/goodnotes — 풀-스크린 단일 캔버스로 마이그레이션).
 *
 * 새 패턴 (tldraw PDF editor 예시와 동일):
 *   1. pdfjs 로 해당 페이지를 오프스크린 canvas 에 렌더
 *   2. PNG dataURL 로 변환
 *   3. tldraw image asset + locked image shape 으로 캔버스 안에 배치
 *   4. 잉크 shape 는 같은 카메라 위에 stack → 한 transform · 한 paint frame
 */

import { pdfjs } from "react-pdf"

// react-pdf 와 동일한 self-host worker. 모듈 import 만으로 전역 설정 정합.
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
}

export interface PdfPageBitmap {
  /** PNG data URL (base64). tldraw asset src 로 그대로 사용. */
  dataUrl: string
  /** tldraw 좌표계 (CSS px) 기준 폭. image shape props.w 에 사용. */
  width: number
  /** tldraw 좌표계 (CSS px) 기준 높이. image shape props.h 에 사용. */
  height: number
  /** 페이지 메타: 전체 페이지 수 — 페이지 nav 용. */
  numPages: number
}

interface RenderArgs {
  signedUrl: string
  pageNumber: number
  /** tldraw 카메라 좌표계 기준 목표 폭 (CSS px). */
  targetWidthCss: number
}

/**
 * 단일 페이지 렌더. 페이지 변경 때마다 다시 호출.
 *
 * 화질 전략:
 *   - 렌더 스케일 = (targetWidthCss / pageWidth) × min(dpr × 2, 3)
 *     · dpr=1 Windows → 2× supersample (Retina 보다 한 단계 위)
 *     · dpr=2 Mac/iPad → 3× clamp (메모리 보호)
 *   - 사용자가 확대해도 어느 정도 깨지지 않음.
 *
 * 보안: signedUrl 만 받음. 호출자가 Supabase storage 의 signed URL 책임.
 */
export async function renderPdfPageBitmap(
  args: RenderArgs,
): Promise<PdfPageBitmap> {
  const { signedUrl, pageNumber, targetWidthCss } = args
  const loadingTask = pdfjs.getDocument({ url: signedUrl })
  const pdf = await loadingTask.promise
  try {
    const safePageNumber = Math.min(Math.max(pageNumber, 1), pdf.numPages)
    const page = await pdf.getPage(safePageNumber)
    const base = page.getViewport({ scale: 1 })
    const cssScale = targetWidthCss / base.width
    const dpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    const supersample = Math.min(dpr * 2, 3)
    const viewport = page.getViewport({ scale: cssScale * supersample })

    const canvas = document.createElement("canvas")
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) throw new Error("no_canvas_ctx")
    // 종이 배경 — pdfjs 는 투명 배경 렌더이므로 흰색을 깔아준다.
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    // pdfjs v5: `canvas` 가 필수 인자. `canvasContext` 는 옵션.
    await page.render({ canvas, canvasContext: ctx, viewport }).promise

    const dataUrl = canvas.toDataURL("image/png")
    return {
      dataUrl,
      width: base.width * cssScale,
      height: base.height * cssScale,
      numPages: pdf.numPages,
    }
  } finally {
    try {
      await pdf.cleanup()
    } catch {
      /* noop */
    }
    try {
      await pdf.destroy()
    } catch {
      /* noop */
    }
  }
}
