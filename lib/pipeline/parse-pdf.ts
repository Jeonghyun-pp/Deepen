/**
 * Stage 1 — Deterministic PDF decomposition.
 * LLM 호출 없음. 실패 시 분모(allChunks)가 정확하지 않아 치명적.
 *
 * 출력: chunks 테이블에 들어갈 형태의 배열.
 *   - ordinal은 문서 내 전역 순서 (0부터)
 *   - page는 1-indexed
 *   - contentType은 text / equation_placeholder / figure_placeholder 중 하나
 */

import { extractText, getDocumentProxy } from "unpdf"

export interface RawChunk {
  ordinal: number
  pageStart: number
  pageEnd: number
  content: string
  contentType: "text" | "equation_placeholder" | "figure_placeholder"
}

const MIN_CHUNK_CHARS = 40
const MAX_CHUNK_CHARS = 2000

/**
 * 문단을 작거나 크면 병합/분할.
 */
function normalizeParagraphs(raw: string[]): string[] {
  const out: string[] = []
  let buffer = ""
  for (const p of raw) {
    const t = p.trim().replace(/\s+/g, " ")
    if (!t) continue

    if (buffer.length === 0) {
      buffer = t
    } else if (buffer.length + t.length + 1 < MIN_CHUNK_CHARS) {
      buffer += " " + t
    } else {
      out.push(buffer)
      buffer = t
    }
  }
  if (buffer) out.push(buffer)

  // 너무 큰 문단 분할 — 문장 경계 우선
  const splitLarge: string[] = []
  for (const p of out) {
    if (p.length <= MAX_CHUNK_CHARS) {
      splitLarge.push(p)
      continue
    }
    const sentences = p.match(/[^.!?。]+[.!?。]+[\s]*/g) ?? [p]
    let chunk = ""
    for (const s of sentences) {
      if ((chunk + s).length > MAX_CHUNK_CHARS && chunk) {
        splitLarge.push(chunk.trim())
        chunk = s
      } else {
        chunk += s
      }
    }
    if (chunk.trim()) splitLarge.push(chunk.trim())
  }

  return splitLarge
}

/**
 * 문단의 종류를 휴리스틱으로 판정.
 * PDF 텍스트 추출이 figure·수식을 놓치거나 깨뜨리면 placeholder로 마킹.
 */
function classifyChunk(text: string): RawChunk["contentType"] {
  const trimmed = text.trim()

  // Figure / Table 캡션
  if (
    /^(figure|fig\.|fig|table|그림|표)\s*\d+/i.test(trimmed) &&
    trimmed.length < 200
  ) {
    return "figure_placeholder"
  }

  // 비문자 비율이 높으면 수식 파편으로 간주
  const nonWord = (trimmed.match(/[^\w\s가-힣]/g) ?? []).length
  const ratio = nonWord / Math.max(1, trimmed.length)
  if (ratio > 0.35 && trimmed.length < 300) {
    return "equation_placeholder"
  }

  return "text"
}

export interface ParsedDocument {
  totalPages: number
  chunks: RawChunk[]
}

export async function parsePdf(buffer: Uint8Array): Promise<ParsedDocument> {
  const pdf = await getDocumentProxy(buffer)
  const { totalPages, text } = await extractText(pdf, { mergePages: false })

  const chunks: RawChunk[] = []
  let ordinal = 0

  for (let i = 0; i < text.length; i++) {
    const page = i + 1
    const pageText = text[i] ?? ""

    // 빈 페이지 → figure 전용 페이지일 가능성 높음
    if (!pageText.trim()) {
      chunks.push({
        ordinal: ordinal++,
        pageStart: page,
        pageEnd: page,
        content: `[Page ${page}: no extractable text — likely figure or image]`,
        contentType: "figure_placeholder",
      })
      continue
    }

    // 기본: 빈 줄로 문단 분할. 부족하면 단일 줄바꿈으로 fallback
    let paragraphs = pageText.split(/\n\s*\n/)
    if (paragraphs.length === 1) paragraphs = pageText.split(/\n/)

    const normalized = normalizeParagraphs(paragraphs)

    for (const para of normalized) {
      chunks.push({
        ordinal: ordinal++,
        pageStart: page,
        pageEnd: page,
        content: para,
        contentType: classifyChunk(para),
      })
    }
  }

  return { totalPages, chunks }
}
