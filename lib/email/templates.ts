/**
 * 이메일 HTML 템플릿 — M3.4. 의존성 없이 단순 string.
 * Spec: 05-llm-prompts.md §8 (요약 규칙), 09-q3-build.md M3.4 (구조 lock).
 *
 * 디자인 원칙:
 *   - 이메일 클라이언트 호환을 위해 인라인 스타일 + 단순 table 레이아웃
 *   - 음수 표현 회피 ("약점이 많다" X → "약점 N개 → N-2개 ↓" O)
 *   - 사회적 hook 한 줄 ("보호자께서 보고 계시는 건 큰 응원입니다")
 */

const BASE_BG = "#fafafa"
const CARD_BG = "#ffffff"
const TEXT = "#1f2937"
const MUTED = "#6b7280"
const ACCENT = "#15803d"

function frame(inner: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:${BASE_BG};font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica Neue,Apple SD Gothic Neo,Noto Sans KR,sans-serif;color:${TEXT}">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BASE_BG};padding:24px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:${CARD_BG};border:1px solid #e5e7eb;border-radius:12px;padding:32px">
${inner}
</table>
</td></tr>
</table>
</body></html>`
}

// ============================================================
// 1. 보호자 동의 magic link
// ============================================================

export function parentConsentEmail(args: {
  studentName: string
  consentUrl: string
}): { subject: string; html: string; text: string } {
  const subject = `${args.studentName}님이 보호자로 등록을 요청했어요 — 동의 한 번이면 됩니다`
  const html = frame(`
    <tr><td>
      <h1 style="margin:0 0 8px 0;font-size:18px;color:${TEXT}">${escapeHtml(args.studentName)}님의 학습 리포트</h1>
      <p style="margin:0 0 20px 0;color:${MUTED};font-size:13px">매주 일요일 오전, 한 주 학습 요약이 이 이메일로 배송됩니다.</p>
      <table cellpadding="14" cellspacing="0" style="background:#f0fdf4;border-radius:8px;width:100%">
        <tr><td>
          <p style="margin:0;font-size:14px;color:${TEXT}">
            보호자께서 학습 진행을 보고 계시는 것만으로 학생에게는 큰 동기가 됩니다.
            아래 버튼 한 번이면 등록이 완료됩니다.
          </p>
        </td></tr>
      </table>
      <p style="margin:24px 0 8px 0">
        <a href="${args.consentUrl}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">동의하고 매주 리포트 받기 →</a>
      </p>
      <p style="margin:0;color:${MUTED};font-size:12px">버튼이 열리지 않으면 다음 주소를 복사해 열어 주세요:<br/><span style="word-break:break-all">${args.consentUrl}</span></p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0"/>
      <p style="margin:0;color:${MUTED};font-size:11px">본 메일은 학생이 직접 보호자 이메일을 입력해 발송된 1회성 안내입니다. 동의하지 않으시면 무시하시면 발송이 종료됩니다.</p>
    </td></tr>
  `)
  const text =
    `${args.studentName}님이 보호자로 등록을 요청했어요.\n\n` +
    `매주 일요일 오전, 한 주 학습 요약을 보내드립니다.\n` +
    `동의 링크: ${args.consentUrl}\n\n` +
    `동의하지 않으시면 이 메일을 무시하시면 됩니다.`
  return { subject, html, text }
}

// ============================================================
// 2. 주간 보호자 리포트
// ============================================================

export interface ParentReportData {
  studentName: string
  /** 'YYYY-MM-DD'. */
  weekStart: string
  weekEnd: string
  /** Opus 가 생성한 4문장 요약. */
  summary: string
  totalAttempts: number
  minutesStudied: number
  /** 평균 theta 변화. 양수=개선. */
  masteryDelta: number
  weakReducedFrom: number
  weakReducedTo: number
  topImproved: { patternLabel: string; thetaDelta: number }[]
  topConcerns: { patternLabel: string; theta: number }[]
  unsubscribeUrl: string
}

export function parentReportEmail(data: ParentReportData): {
  subject: string
  html: string
  text: string
} {
  const subject = `${data.studentName}님의 이번 주 학습 리포트 (${data.weekStart} ~ ${data.weekEnd})`
  const masteryPercent = (data.masteryDelta * 100).toFixed(1)
  const masterySign = data.masteryDelta >= 0 ? "+" : ""

  const improvedRows = data.topImproved
    .map(
      (p) => `
      <tr>
        <td style="padding:6px 0;color:${TEXT};font-size:13px">${escapeHtml(p.patternLabel)}</td>
        <td style="padding:6px 0;color:${ACCENT};font-size:13px;text-align:right">+${(p.thetaDelta * 100).toFixed(1)}p</td>
      </tr>`,
    )
    .join("")

  const concernRows = data.topConcerns
    .map(
      (p) => `
      <tr>
        <td style="padding:6px 0;color:${TEXT};font-size:13px">${escapeHtml(p.patternLabel)}</td>
        <td style="padding:6px 0;color:${MUTED};font-size:13px;text-align:right">${(p.theta * 100).toFixed(0)}%</td>
      </tr>`,
    )
    .join("")

  const html = frame(`
    <tr><td>
      <p style="margin:0;font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:1px">${data.weekStart} ~ ${data.weekEnd}</p>
      <h1 style="margin:6px 0 24px 0;font-size:22px;color:${TEXT}">${escapeHtml(data.studentName)}님의 한 주</h1>

      <p style="margin:0 0 24px 0;font-size:14px;line-height:1.7;color:${TEXT}">${escapeHtml(data.summary)}</p>

      <table cellpadding="14" cellspacing="0" width="100%" style="background:#f0fdf4;border-radius:8px;margin-bottom:16px">
        <tr>
          <td style="font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:1px">약점 패턴</td>
          <td style="font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:1px;text-align:right">마스터리</td>
        </tr>
        <tr>
          <td style="font-size:18px;font-weight:600;color:${TEXT}">${data.weakReducedFrom}개 → ${data.weakReducedTo}개</td>
          <td style="font-size:18px;font-weight:600;color:${data.masteryDelta >= 0 ? ACCENT : MUTED};text-align:right">${masterySign}${masteryPercent}%p</td>
        </tr>
      </table>

      <table cellpadding="14" cellspacing="0" width="100%" style="background:#fafafa;border-radius:8px;margin-bottom:24px">
        <tr>
          <td style="font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:1px">푼 문제</td>
          <td style="font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:1px;text-align:right">학습 시간</td>
        </tr>
        <tr>
          <td style="font-size:16px;font-weight:600;color:${TEXT}">${data.totalAttempts}문제</td>
          <td style="font-size:16px;font-weight:600;color:${TEXT};text-align:right">${Math.round(data.minutesStudied)}분</td>
        </tr>
      </table>

      ${
        improvedRows
          ? `<h2 style="margin:24px 0 8px 0;font-size:14px;color:${TEXT}">개선이 컸던 유형</h2>
             <table cellpadding="0" cellspacing="0" width="100%">${improvedRows}</table>`
          : ""
      }

      ${
        concernRows
          ? `<h2 style="margin:24px 0 8px 0;font-size:14px;color:${TEXT}">조금 더 다질 유형</h2>
             <table cellpadding="0" cellspacing="0" width="100%">${concernRows}</table>`
          : ""
      }

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0"/>

      <p style="margin:0 0 4px 0;font-size:13px;color:${TEXT}">보호자께서 보고 계시는 건 학생에게 큰 응원입니다.</p>
      <p style="margin:0;font-size:11px;color:${MUTED}">이 리포트가 반갑지 않으시다면 <a href="${data.unsubscribeUrl}" style="color:${MUTED}">한 번 클릭으로 해지</a>할 수 있습니다.</p>
    </td></tr>
  `)
  const text =
    `${data.studentName}님의 한 주 (${data.weekStart} ~ ${data.weekEnd})\n\n` +
    `${data.summary}\n\n` +
    `약점 패턴: ${data.weakReducedFrom}개 → ${data.weakReducedTo}개\n` +
    `마스터리: ${masterySign}${masteryPercent}%p\n` +
    `푼 문제: ${data.totalAttempts}, 학습 시간: ${Math.round(data.minutesStudied)}분\n\n` +
    `해지: ${data.unsubscribeUrl}`
  return { subject, html, text }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
