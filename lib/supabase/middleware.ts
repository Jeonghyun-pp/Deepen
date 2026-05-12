import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PROTECTED_PREFIXES = ["/v2", "/admin", "/upload", "/documents"]
// /v2 (정확) 은 public editorial 랜딩. /v2/* 은 보호.
const PUBLIC_EXACT = new Set<string>(["/v2"])

// 임시 로그인 우회 — env 둘 다 set 시 모든 보호 경로 통과.
const AUTH_BYPASS = !!(
  process.env.DEV_AUTH_BYPASS_USER_ID && process.env.DEV_AUTH_BYPASS_EMAIL
)

export async function updateSession(request: NextRequest) {
  // 기본 응답 — cookies setAll이 호출되면 아래에서 재생성된다
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 세션 만료 갱신 — proxy에서 반드시 호출해야 쿠키가 새로고침된다
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // 루트 진입은 auth 상태에 따라 분기. 로그인 → 워크스페이스 진입점, 아니면 editorial 랜딩.
  if (path === "/") {
    const target = AUTH_BYPASS || user ? "/v2/home" : "/v2"
    return NextResponse.redirect(new URL(target, request.url))
  }

  const isProtected =
    !PUBLIC_EXACT.has(path) &&
    PROTECTED_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(prefix + "/"),
    )

  if (isProtected && !user && !AUTH_BYPASS) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("redirect", path)
    return NextResponse.redirect(loginUrl)
  }

  return response
}
