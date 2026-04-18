/**
 * Supabase 연결 검증 스크립트
 *
 * 실행: npm run verify
 *
 * 검사 항목
 *  1) DATABASE_URL — postgres 직접 연결 + SELECT 1
 *  2) NEXT_PUBLIC_SUPABASE_URL / ANON_KEY — REST 요청으로 인증 엔드포인트 ping
 *  3) SUPABASE_SERVICE_ROLE_KEY — admin client로 auth.admin.listUsers (service_role 권한 확인)
 */

import { config } from "dotenv"
import postgres from "postgres"
import { createClient } from "@supabase/supabase-js"

config({ path: ".env.local" })

type Check = { name: string; ok: boolean; detail: string }

async function checkDatabaseUrl(): Promise<Check> {
  const url = process.env.DATABASE_URL
  if (!url) return { name: "DATABASE_URL", ok: false, detail: "env 미설정" }

  try {
    const sql = postgres(url, { prepare: false, max: 1 })
    const result = await sql<{ one: number }[]>`SELECT 1 AS one`
    await sql.end()
    return {
      name: "DATABASE_URL (postgres)",
      ok: result[0].one === 1,
      detail: "SELECT 1 성공",
    }
  } catch (e) {
    return {
      name: "DATABASE_URL (postgres)",
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    }
  }
}

async function checkAnonKey(): Promise<Check> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return { name: "ANON_KEY", ok: false, detail: "env 미설정" }
  }
  try {
    const client = createClient(url, anon)
    const { error } = await client.auth.getSession()
    if (error) throw error
    return { name: "ANON_KEY (auth)", ok: true, detail: "session API 응답 정상" }
  } catch (e) {
    return {
      name: "ANON_KEY (auth)",
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    }
  }
}

async function checkServiceRoleKey(): Promise<Check> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return { name: "SERVICE_ROLE_KEY", ok: false, detail: "env 미설정" }
  }
  try {
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1 })
    if (error) throw error
    return {
      name: "SERVICE_ROLE_KEY (admin)",
      ok: true,
      detail: `listUsers 호출 성공 (현재 사용자 ${data.users.length}명 이상)`,
    }
  } catch (e) {
    return {
      name: "SERVICE_ROLE_KEY (admin)",
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    }
  }
}

async function main() {
  console.log("=== Deepen 연결 검증 ===\n")
  const checks = await Promise.all([
    checkDatabaseUrl(),
    checkAnonKey(),
    checkServiceRoleKey(),
  ])

  for (const c of checks) {
    const icon = c.ok ? "[OK]" : "[FAIL]"
    console.log(`${icon} ${c.name}`)
    console.log(`     ${c.detail}\n`)
  }

  const failed = checks.filter((c) => !c.ok)
  if (failed.length > 0) {
    console.error(`실패 ${failed.length}건. .env.local 값 확인 필요.`)
    process.exit(1)
  }

  console.log("모든 연결 정상. Week 1 착수 가능.")
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
