/**
 * Drizzle 마이그레이션 실행 스크립트.
 *
 * 절차
 *  1) `npm run db:generate` — schema.ts 변경사항을 SQL 파일로 생성 (drizzle/)
 *  2) `npm run db:migrate`  — 생성된 SQL을 Supabase DB에 적용
 *  3) Supabase SQL Editor에서 drizzle/rls-policies.sql 실행 (RLS + auth 트리거)
 */

import { readFile } from "node:fs/promises"
import { config } from "dotenv"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

config({ path: ".env.local" })

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set")

  const client = postgres(url, { max: 1, prepare: false })
  const db = drizzle(client)

  console.log("Running Drizzle migrations...")
  await migrate(db, { migrationsFolder: "./drizzle" })
  console.log("Schema migrations applied.")

  console.log("Applying RLS policies...")
  const rlsSql = await readFile("./drizzle/rls.sql", "utf8")
  await client.unsafe(rlsSql)
  console.log("RLS policies applied.")

  await client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
