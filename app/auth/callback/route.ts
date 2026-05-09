import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

/**
 * Magic link → /auth/callback?code=xxx&next=/v2/home
 * code를 세션으로 교환하고 next 경로로 리다이렉트한다.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = url.searchParams.get("next") ?? "/v2/home"

  if (!code) {
    return NextResponse.redirect(`${url.origin}/login?error=missing_code`)
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      `${url.origin}/login?error=${encodeURIComponent(error.message)}`
    )
  }

  // next는 상대 경로만 허용 (open redirect 방지)
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/v2/home"
  return NextResponse.redirect(`${url.origin}${safeNext}`)
}
