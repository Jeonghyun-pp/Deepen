import type { User } from "@supabase/supabase-js"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { env } from "@/lib/env"

/**
 * 로그인 프로세스 제거 후의 단일 user.
 * env.DEV_AUTH_BYPASS_USER_ID / _EMAIL 을 그대로 mock User 로 감싼다.
 * supabase 클라이언트는 RLS 우회 없이 Storage·Realtime 등을 쓰는 호출처용으로 함께 반환.
 */
export async function requireUser(): Promise<{
  user: User
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
}> {
  const supabase = await createSupabaseServerClient()
  const user = {
    id: env.DEV_AUTH_BYPASS_USER_ID,
    email: env.DEV_AUTH_BYPASS_EMAIL,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date(0).toISOString(),
  } as User
  return { user, supabase }
}
