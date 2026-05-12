import type { User } from "@supabase/supabase-js"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { env, features } from "@/lib/env"

/**
 * Route Handler / Server Action에서 세션 검증.
 * 미인증이면 401 Response를 throw — Next.js가 그대로 응답한다.
 *
 * features.authBypass (DEV_AUTH_BYPASS_USER_ID + EMAIL) 활성 시 고정 user 리턴.
 * 임시 로그인 우회용. production env 에는 절대 set 금지.
 */
export async function requireUser(): Promise<{
  user: User
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
}> {
  const supabase = await createSupabaseServerClient()
  if (features.authBypass) {
    const bypassUser = {
      id: env.DEV_AUTH_BYPASS_USER_ID!,
      email: env.DEV_AUTH_BYPASS_EMAIL!,
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date(0).toISOString(),
    } as User
    return { user: bypassUser, supabase }
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    })
  }
  return { user, supabase }
}
