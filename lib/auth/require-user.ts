import { createSupabaseServerClient } from "@/lib/supabase/server"

/**
 * Route Handler / Server Action에서 세션 검증.
 * 미인증이면 401 Response를 throw — Next.js가 그대로 응답한다.
 */
export async function requireUser() {
  const supabase = await createSupabaseServerClient()
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
