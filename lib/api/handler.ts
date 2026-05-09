import { requireUser } from "@/lib/auth/require-user"
import { requireAdmin } from "@/lib/auth/require-admin"

type Authed = Awaited<ReturnType<typeof requireUser>>
type RouteCtx<P> = { params: Promise<P> }

interface HandlerCtx<P> extends Authed {
  params: P
}

/**
 * Route Handler 공통 wrapper:
 *   - requireUser로 세션 검증 (미인증 시 401 자동 응답)
 *   - dynamic route params 자동 await
 *   - 예외 발생 시 [tag] 로깅 + 500 internal_error 반환
 *
 * 사용:
 *   export const GET = withAuth("GET /api/foo", async (req, { user }) => { ... })
 *   export const DELETE = withAuth("...", async (req, { user, params }) => { ... })  // dynamic
 */
export function withAuth<P = Record<string, never>>(
  tag: string,
  handler: (req: Request, ctx: HandlerCtx<P>) => Promise<Response>,
): (req: Request, route?: RouteCtx<P>) => Promise<Response> {
  return async (req, route) => {
    try {
      const authed = await requireUser()
      const params = (route ? await route.params : ({} as P))
      return await handler(req, { ...authed, params })
    } catch (e) {
      if (e instanceof Response) return e
      console.error(`[${tag}]`, e)
      return Response.json({ error: "internal_error" }, { status: 500 })
    }
  }
}

/**
 * Admin role 강제. 화이트리스트(ADMIN_EMAILS) 기반.
 * 미인증 401, 비관리자 403 — requireAdmin 이 throw.
 */
export function withAdmin<P = Record<string, never>>(
  tag: string,
  handler: (req: Request, ctx: HandlerCtx<P>) => Promise<Response>,
): (req: Request, route?: RouteCtx<P>) => Promise<Response> {
  return async (req, route) => {
    try {
      const authed = await requireAdmin()
      const params = route ? await route.params : ({} as P)
      return await handler(req, { ...authed, params })
    } catch (e) {
      if (e instanceof Response) return e
      console.error(`[${tag}]`, e)
      return Response.json({ error: "internal_error" }, { status: 500 })
    }
  }
}

export const apiError = {
  badRequest: (code: string) => Response.json({ error: code }, { status: 400 }),
  notFound: (code = "not_found") => Response.json({ error: code }, { status: 404 }),
  forbidden: (code = "forbidden") => Response.json({ error: code }, { status: 403 }),
  conflict: (code: string) => Response.json({ error: code }, { status: 409 }),
}
