import { NextResponse, type NextRequest } from "next/server"

// Next 16에서 middleware.ts → proxy.ts로 이름 변경.
// 로그인 프로세스 제거 — 인증 분기/세션 갱신 없음. root 진입만 home 으로 보낸다.
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/v2/home", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/"],
}
