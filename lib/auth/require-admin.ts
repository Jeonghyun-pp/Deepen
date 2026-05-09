/**
 * Admin role 가드 — Q1 단순화 (ADMIN_EMAILS 화이트리스트).
 *
 * Q1: ADMIN_EMAILS env 콤마 구분. 시드 작업자 이메일만 등록.
 * M4.1: organizations + org_members.role='admin' 으로 본격 RBAC.
 */

import { requireUser } from "./require-user"

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? ""
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export async function requireAdmin() {
  const authed = await requireUser()
  const email = authed.user.email?.toLowerCase()
  const allow = getAdminEmails()
  if (!email || !allow.includes(email)) {
    throw new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    })
  }
  return authed
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return getAdminEmails().includes(email.toLowerCase())
}
