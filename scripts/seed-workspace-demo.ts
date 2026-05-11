/**
 * 워크스페이스 v0 시각 검증용 최소 시드 스크립트 (Phase 4 Path A 실측 차단 해제).
 *
 * 실행: npx tsx scripts/seed-workspace-demo.ts
 *
 * 무엇을 하나:
 *   1. ADMIN_EMAILS 첫 이메일의 user row 찾기 (없으면 abort — Magic Link 로그인 먼저 해주세요)
 *   2. users.onboarded_at NULL 이면 NOW() 채움
 *   3. docs/service-flow-implementation-status.pdf 를 Supabase Storage `documents` 버킷에 업로드
 *   4. documents row insert (status='ready')
 *   5. chunks 3개 dummy insert
 *   6. nodes — 1 pattern (status='published') + 1 item (status='published') insert
 *   7. edges — pattern -[contains]-> item insert
 *   8. /v2/workspace/[itemId] URL 출력
 *
 * idempotent X — 매 실행마다 새 document/item 생성. 정리는 별도.
 */

import { config } from "dotenv"
import { eq } from "drizzle-orm"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { db } from "../lib/db"
import { chunks, documents, edges, nodes, users } from "../lib/db/schema"
import { createSupabaseAdminClient } from "../lib/supabase/admin"

config({ path: ".env.local" })

async function main() {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
  if (adminEmails.length === 0) {
    console.error("❌ ADMIN_EMAILS 가 .env.local 에 없음")
    process.exit(1)
  }
  const targetEmail = adminEmails[0]

  // 1) Supabase Auth 에서 email → user_id 룩업
  const adminClient = createSupabaseAdminClient()
  const { data: authPage, error: authErr } =
    await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (authErr) {
    console.error("❌ auth.admin.listUsers 실패:", authErr.message)
    process.exit(1)
  }
  const authUser = authPage.users.find((u) => u.email === targetEmail)
  if (!authUser) {
    console.error(
      `❌ Supabase Auth 에 ${targetEmail} 가 없음. Magic Link 로그인 먼저 해주세요.`,
    )
    process.exit(1)
  }

  // public.users 에서 onboarded_at 조회
  const [user] = await db
    .select({ id: users.id, onboardedAt: users.onboardedAt })
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1)
  if (!user) {
    console.error(
      `❌ public.users(id=${authUser.id}) row 없음. 일단 한 번 /v2/home 진입하여 row 생성 후 재실행해 주세요.`,
    )
    process.exit(1)
  }
  console.log(`✓ user: ${targetEmail} (${user.id})`)

  // 2) onboarded_at 세팅
  if (!user.onboardedAt) {
    await db
      .update(users)
      .set({ onboardedAt: new Date() })
      .where(eq(users.id, user.id))
    console.log("✓ onboarded_at 채움")
  }

  // 3) PDF 업로드
  const pdfPath = join(process.cwd(), "docs/service-flow-implementation-status.pdf")
  const pdfBuffer = await readFile(pdfPath)
  const storagePath = `${user.id}/seed-${Date.now()}.pdf`
  const { error: uploadErr } = await adminClient.storage
    .from("documents")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    })
  if (uploadErr) {
    console.error("❌ Storage 업로드 실패:", uploadErr.message)
    process.exit(1)
  }
  console.log(`✓ PDF 업로드: ${storagePath} (${pdfBuffer.byteLength} bytes)`)

  // 4) documents row
  const [doc] = await db
    .insert(documents)
    .values({
      userId: user.id,
      title: "워크스페이스 데모 강의안",
      storagePath,
      pageCount: 4,
      status: "ready",
    })
    .returning({ id: documents.id })
  console.log(`✓ documents row: ${doc.id}`)

  // 5) chunks
  const dummyChunks = [
    {
      ordinal: 1,
      sectionTitle: "1. 미분의 정의",
      pageStart: 1,
      content:
        "함수 f(x) 의 x=a 에서의 미분계수는 lim_{h→0} (f(a+h) − f(a))/h 로 정의된다.",
    },
    {
      ordinal: 2,
      sectionTitle: "2. 도함수의 기본 공식",
      pageStart: 2,
      content:
        "f(x) = x^n 일 때 f'(x) = n·x^{n-1}. 상수배·합·차의 미분은 분리된다.",
    },
    {
      ordinal: 3,
      sectionTitle: "3. 접선의 방정식",
      pageStart: 3,
      content:
        "곡선 y=f(x) 위 점 (a, f(a)) 에서의 접선: y − f(a) = f'(a)(x − a).",
    },
  ]
  await db.insert(chunks).values(
    dummyChunks.map((c) => ({
      userId: user.id,
      documentId: doc.id,
      ordinal: c.ordinal,
      sectionTitle: c.sectionTitle,
      pageStart: c.pageStart,
      pageEnd: c.pageStart,
      contentType: "text" as const,
      content: c.content,
    })),
  )
  console.log(`✓ chunks ${dummyChunks.length} 개 삽입`)

  // 6) pattern + item nodes (status='published')
  const [pattern] = await db
    .insert(nodes)
    .values({
      type: "pattern",
      label: "접선의 방정식",
      content: "곡선 위 한 점에서의 접선을 구하는 유형",
      grade: "수Ⅱ",
      displayLayer: "pattern",
      status: "published",
    })
    .returning({ id: nodes.id })

  const [item] = await db
    .insert(nodes)
    .values({
      type: "item",
      label:
        "곡선 y = x^3 − 3x + 2 위의 점 (1, 0) 에서의 접선의 방정식을 구하시오.",
      content: "",
      itemSource: "데모",
      itemNumber: 1,
      itemDifficulty: 0.4,
      itemChoices: ["y = 0", "y = 3x − 3", "y = x − 1", "y = −3x + 3", "y = −x + 1"],
      itemAnswer: "y = 0",
      itemSolution:
        "1) f(x) = x^3 − 3x + 2 → f'(x) = 3x^2 − 3.\n2) f'(1) = 3 − 3 = 0.\n3) 점 (1, 0) 에서 기울기 0 → y − 0 = 0(x − 1) → y = 0.",
      status: "published",
    })
    .returning({ id: nodes.id })

  console.log(`✓ pattern node: ${pattern.id}`)
  console.log(`✓ item node:    ${item.id}`)

  // 7) contains edge
  await db.insert(edges).values({
    userId: user.id,
    sourceNodeId: pattern.id,
    targetNodeId: item.id,
    type: "contains",
  })
  console.log(`✓ contains edge (pattern → item)`)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  console.log(`\n✅ 시드 완료. 워크스페이스 진입:`)
  console.log(`   ${appUrl}/v2/workspace/${item.id}`)
  process.exit(0)
}

main().catch((e) => {
  console.error("❌ seed 실패:", e)
  process.exit(1)
})
