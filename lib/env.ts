/**
 * 환경 변수 zod 검증.
 * Spec: docs/build-spec/01-tech-stack.md "환경 변수 (lock)".
 *
 * 부팅 시 1회 parse. 누락되면 명확한 에러로 즉시 차단.
 *
 * 정책:
 *   - Supabase·DB·Anthropic 은 hard-required (없으면 핵심 기능 X).
 *   - OpenAI·Admin·기타는 optional (없으면 일부 기능만 막힘).
 *   - 프론트(NEXT_PUBLIC_*) 키는 런타임에 별도 검증 (이 파일은 서버용).
 *
 * 사용:
 *   import { env } from "@/lib/env"
 *   const url = env.SUPABASE_URL
 */

import { z } from "zod"

const required = (name: string) =>
  z.string().min(1, { message: `${name} is required` })

const schema = z.object({
  // Supabase (필수)
  NEXT_PUBLIC_SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),

  // DB (필수)
  DATABASE_URL: required("DATABASE_URL"),

  // LLM 키
  // Q1: Anthropic = AI 코치/리캡카드/8가지 분류 워커. 없으면 코치 패널만 막힘.
  // OpenAI = 기존 PDF 파이프라인 GPT-4o-mini.
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  CLAUDE_MODEL: z.string().default("claude-opus-4-7"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),

  // Admin (시드 작업)
  ADMIN_EMAILS: z.string().default(""),

  // App URL (선택, 메일/cron 콜백용)
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // OpenAlex (옛 PDF 메타데이터 보강 — 옵션)
  OPENALEX_EMAIL: z.string().email().optional(),
})

export type Env = z.infer<typeof schema>

function loadEnv(): Env {
  const result = schema.safeParse(process.env)
  if (!result.success) {
    const flatten = result.error.flatten().fieldErrors
    const lines = Object.entries(flatten).map(
      ([k, v]) => `  - ${k}: ${(v ?? []).join(", ")}`,
    )
    throw new Error(
      `Invalid environment variables:\n${lines.join("\n")}\n` +
        `Set them in .env.local. See docs/build-spec/01-tech-stack.md.`,
    )
  }
  return result.data
}

/**
 * 검증된 env 객체. import 시점에 검증되므로 Next.js 부팅 직후 1회 실행.
 */
export const env = loadEnv()

/**
 * 기능별 가용성 헬퍼.
 * UI/API 가 "이 기능 쓸 수 있는지" 판단할 때 사용.
 */
export const features = {
  aiCoach: !!env.ANTHROPIC_API_KEY,
  pdfExtraction: !!env.OPENAI_API_KEY,
  adminConfigured: env.ADMIN_EMAILS.split(",").map((s) => s.trim()).filter(Boolean).length > 0,
} as const
