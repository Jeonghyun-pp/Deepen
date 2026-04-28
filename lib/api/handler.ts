import { requireUser } from "@/lib/auth/require-user"

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

export const apiError = {
  badRequest: (code: string) => Response.json({ error: code }, { status: 400 }),
  notFound: (code = "not_found") => Response.json({ error: code }, { status: 404 }),
}
