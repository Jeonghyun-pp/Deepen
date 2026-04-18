import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

// Next 16에서 middleware.ts → proxy.ts로 이름 변경, 동작은 동일.
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // _next 내부 파일, 이미지 자산은 제외
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
