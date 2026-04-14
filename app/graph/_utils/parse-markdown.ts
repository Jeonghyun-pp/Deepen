import type { NoteBlock } from "../_data/types";

// 간단한 라인 기반 md → NoteBlock 파서.
// 지원: # ## ### 헤딩, - * / 1. 리스트, ``` 코드 블록, --- 구분선, 나머지는 paragraph.
// 연속된 빈 줄은 paragraph 구분자로 취급.
export function parseMarkdownToBlocks(md: string): { title: string; blocks: NoteBlock[] } {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: NoteBlock[] = [];
  let title = "";
  let i = 0;

  // 첫 H1을 제목으로 흡수
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i < lines.length && /^#\s+/.test(lines[i])) {
    title = lines[i].replace(/^#\s+/, "").trim();
    i++;
  }

  let paragraphBuf: string[] = [];
  const flushParagraph = () => {
    const text = paragraphBuf.join("\n").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraphBuf = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 코드 블록
    if (/^```/.test(trimmed)) {
      flushParagraph();
      const lang = trimmed.replace(/^```/, "").trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // closing ```
      blocks.push({ type: "code", code: codeLines.join("\n"), language: lang || undefined });
      continue;
    }

    // 구분선
    if (/^(---|\*\*\*|___)$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: "divider" });
      i++;
      continue;
    }

    // 헤딩
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length as 1 | 2 | 3;
      blocks.push({ type: "heading", level, text: headingMatch[2].trim() });
      i++;
      continue;
    }

    // 리스트 (연속 수집)
    const ulMatch = /^[-*]\s+(.+)$/.exec(trimmed);
    const olMatch = /^\d+\.\s+(.+)$/.exec(trimmed);
    if (ulMatch || olMatch) {
      flushParagraph();
      const ordered = Boolean(olMatch);
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        const m = ordered ? /^\d+\.\s+(.+)$/.exec(t) : /^[-*]\s+(.+)$/.exec(t);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    // 빈 줄 → 문단 종료
    if (trimmed === "") {
      flushParagraph();
      i++;
      continue;
    }

    // paragraph 누적
    paragraphBuf.push(line);
    i++;
  }
  flushParagraph();

  if (blocks.length === 0) blocks.push({ type: "paragraph", text: "" });
  return { title: title || "가져온 노트", blocks };
}
