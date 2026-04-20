/**
 * Stage 2 — Hierarchical segmentation (heuristic only).
 * LLM 없음. 깨지기 쉬우면 page 단위 fallback.
 */

import type { RawChunk } from "./parse-pdf"

export interface Section {
  title: string | null
  chunks: RawChunk[]
  /** LLM 프롬프트에 들어갈 텍스트 (수식·figure placeholder 제외) */
  prompt: string
  /** 섹션의 첫 chunk ordinal — 디버그/정렬용 */
  startOrdinal: number
  /** 섹션 번호 경로 (예: "2.1.3" → [2, 1, 3]). 감지 실패 시 null */
  numberPath: number[] | null
}

/**
 * heading title 에서 "1.2.3 ..." 혹은 "1 ..." 같은 선두 숫자 경로를 파싱.
 * 파싱 실패 시 null. "Chapter 2" / "제 3장" 은 단일 레벨([2], [3])로 취급.
 */
export function parseSectionNumber(title: string | null): number[] | null {
  if (!title) return null
  const trimmed = title.trim()

  const dotMatch = trimmed.match(/^(\d+(?:\.\d+)*)\.?\s+/)
  if (dotMatch) {
    return dotMatch[1].split(".").map((s) => parseInt(s, 10))
  }

  const wordMatch = trimmed.match(/^(?:chapter|section|part|appendix)\s+(\d+)/i)
  if (wordMatch) return [parseInt(wordMatch[1], 10)]

  const koMatch = trimmed.match(/^제?\s*(\d+)\s*[장절편부]/)
  if (koMatch) return [parseInt(koMatch[1], 10)]

  return null
}

/**
 * 번호 경로 배열에서 parent index 관계를 계산한다.
 * parent는 "strict prefix + length - 1" 조건: [2,1,3]의 parent는 [2,1].
 * parent가 배열 내 여러 개면 가장 가까운 것(같은 prefix의 마지막 등장).
 */
export function computeSectionParents(
  sections: Section[]
): (number | null)[] {
  const parents: (number | null)[] = new Array(sections.length).fill(null)
  for (let i = 0; i < sections.length; i++) {
    const path = sections[i].numberPath
    if (!path || path.length < 2) continue
    const parentPath = path.slice(0, -1)

    // 이전 섹션들 중 같은 parentPath를 가진 가장 가까운 섹션 찾기
    for (let j = i - 1; j >= 0; j--) {
      const other = sections[j].numberPath
      if (!other) continue
      if (
        other.length === parentPath.length &&
        parentPath.every((n, k) => n === other[k])
      ) {
        parents[i] = j
        break
      }
    }
  }
  return parents
}

// 섹션당 텍스트 예산. gpt-4o-mini 컨텍스트 여유롭게 잡고 프롬프트 크기 포함해도 안전한 선
const MAX_SECTION_CHARS = 6000

/**
 * 짧고 제목 패턴인 chunk = heading 후보.
 */
function isHeadingLike(chunk: RawChunk): boolean {
  const t = chunk.content.trim()
  if (t.length > 120) return false
  if (chunk.contentType !== "text") return false

  // 숫자 매기기 (1., 1.1, 1.1.1, Section 3, Chapter 2, 제3장, 3장)
  if (/^(\d+(\.\d+)*\.?\s+)/.test(t)) return true
  if (/^(chapter|section|part|appendix)\s+\d+/i.test(t)) return true
  if (/^(제\s*\d+\s*[장절편부]|\d+\s*[장절])/.test(t)) return true

  // 전부 대문자로 시작하는 짧은 라인 (ALL CAPS HEADING)
  if (t.length < 60 && t === t.toUpperCase() && /[A-Z]/.test(t)) return true

  return false
}

/**
 * 섹션 경계: heading 감지 또는 페이지 변경 + 누적량 초과.
 */
export function groupSections(chunks: RawChunk[]): Section[] {
  const sections: Section[] = []
  let current: { title: string | null; chunks: RawChunk[]; chars: number; start: number } = {
    title: null,
    chunks: [],
    chars: 0,
    start: 0,
  }

  const flush = () => {
    if (current.chunks.length === 0) return
    const prompt = current.chunks
      .filter((c) => c.contentType === "text")
      .map((c) => c.content)
      .join("\n\n")
    sections.push({
      title: current.title,
      chunks: current.chunks,
      prompt,
      startOrdinal: current.start,
      numberPath: parseSectionNumber(current.title),
    })
  }

  for (const chunk of chunks) {
    const heading = isHeadingLike(chunk)

    // heading 발견 → 기존 섹션 마감
    if (heading && current.chunks.length > 0) {
      flush()
      current = {
        title: chunk.content.trim(),
        chunks: [chunk],
        chars: chunk.content.length,
        start: chunk.ordinal,
      }
      continue
    }

    // 빈 섹션의 첫 heading
    if (heading && current.chunks.length === 0) {
      current = {
        title: chunk.content.trim(),
        chunks: [chunk],
        chars: chunk.content.length,
        start: chunk.ordinal,
      }
      continue
    }

    // 누적량 초과 → 제목 없는 새 섹션으로 강제 분할
    if (current.chars + chunk.content.length > MAX_SECTION_CHARS) {
      flush()
      current = {
        title: current.title ? `${current.title} (cont.)` : null,
        chunks: [chunk],
        chars: chunk.content.length,
        start: chunk.ordinal,
      }
      continue
    }

    current.chunks.push(chunk)
    current.chars += chunk.content.length
  }

  flush()

  // heading 하나도 없으면 섹션 1개가 됨 — 이 경우 페이지 단위로 강제 재분할
  if (sections.length === 1 && chunks.length > 0 && sections[0].title === null) {
    return fallbackByPage(chunks)
  }

  return sections
}

function fallbackByPage(chunks: RawChunk[]): Section[] {
  const sections: Section[] = []
  let buffer: RawChunk[] = []
  let bufChars = 0
  let start = chunks[0]?.ordinal ?? 0

  const flush = () => {
    if (buffer.length === 0) return
    const pages = [...new Set(buffer.map((c) => c.pageStart))]
    const title = `Pages ${pages[0]}-${pages[pages.length - 1]}`
    const prompt = buffer
      .filter((c) => c.contentType === "text")
      .map((c) => c.content)
      .join("\n\n")
    sections.push({
      title,
      chunks: buffer,
      prompt,
      startOrdinal: start,
      numberPath: null,
    })
    buffer = []
    bufChars = 0
  }

  for (const chunk of chunks) {
    if (bufChars + chunk.content.length > MAX_SECTION_CHARS) {
      flush()
      start = chunk.ordinal
    }
    buffer.push(chunk)
    bufChars += chunk.content.length
  }
  flush()
  return sections
}
