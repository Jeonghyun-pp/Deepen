/**
 * 클라 측 API fetch wrapper. 같은 origin Next.js Route Handler 호출용.
 * Spec: 03-api-contracts.md.
 *
 * 에러 처리:
 *   - HTTP !ok → throw ApiError(code, message). Component 가 catch.
 *   - 401 → 로그인 페이지 redirect (호출 사이트가 결정).
 */

import type { SubmitAttemptRequest, SubmitAttemptResponse } from "@/lib/api/schemas/attempts"
import type { ItemResponse } from "@/lib/api/schemas/items"
import type {
  ClassifyReasonsRequest,
  ClassifyReasonsResponse,
} from "@/lib/api/schemas/classify-reasons"
import type { ReasonTag } from "@/lib/db/schema"

export class ApiError extends Error {
  constructor(public code: string, public status: number, message?: string) {
    super(message ?? code)
    this.name = "ApiError"
  }
}

async function jsonRequest<T>(
  url: string,
  init: RequestInit & { json?: unknown },
): Promise<T> {
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      ...(init.json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    credentials: "include",
  })

  if (!res.ok) {
    let code = "internal_error"
    try {
      const body = await res.json()
      code = body?.error ?? code
    } catch {
      /* ignore */
    }
    throw new ApiError(code, res.status)
  }
  return (await res.json()) as T
}

export const fetchItem = (itemId: string) =>
  jsonRequest<ItemResponse>(`/api/items/${itemId}`, { method: "GET" })

export const submitAttempt = (payload: SubmitAttemptRequest) =>
  jsonRequest<SubmitAttemptResponse>(`/api/attempts`, {
    method: "POST",
    json: payload,
  })

/**
 * M2.4: 오답 attempt 직후 호출. AI 분류 + reasonTags merge.
 * 실패 시 null (UI 는 룰 태그만 유지).
 */
export async function classifyReasonsFollowup(
  payload: ClassifyReasonsRequest,
): Promise<ReasonTag[] | null> {
  try {
    const res = await jsonRequest<ClassifyReasonsResponse>(
      `/api/attempts/classify-reasons`,
      { method: "POST", json: payload },
    )
    return res.mergedTags
  } catch {
    return null
  }
}
