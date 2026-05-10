/**
 * Toss Payments REST API wrapper — 서버 측 호출만.
 * Spec: 09-q3-build.md M3.1, https://docs.tosspayments.com/reference.
 *
 * 인증: Authorization: Basic base64(TOSS_SECRET_KEY:)
 *   ":" 뒤가 비어 있는 게 정상 (username only).
 *
 * 호출 종류:
 *   - confirmPayment: 표준 결제창 완료 후 client → server confirm.
 *   - chargeBillingKey: cron 자동 결제 (저장된 billingKey 사용).
 *   - getPayment: 상태 조회 (재처리·환불 검증).
 *
 * 모든 호출은 환경변수 TOSS_SECRET_KEY 가 있어야 작동. 없으면 throw —
 * 호출자(라우트) 가 dryRun 분기 처리.
 */

const TOSS_BASE = "https://api.tosspayments.com"

export class TossError extends Error {
  constructor(
    public httpStatus: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = "TossError"
  }
}

function authHeader(): string {
  const key = process.env.TOSS_SECRET_KEY
  if (!key) throw new TossError(0, "missing_secret", "TOSS_SECRET_KEY 미설정")
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`
}

interface TossErrorBody {
  code?: string
  message?: string
}

async function request<T>(
  path: string,
  init: { method: "POST" | "GET"; body?: unknown; idempotencyKey?: string },
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: authHeader(),
    "Content-Type": "application/json",
  }
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey

  const res = await fetch(`${TOSS_BASE}${path}`, {
    method: init.method,
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  })

  if (!res.ok) {
    let body: TossErrorBody = {}
    try {
      body = (await res.json()) as TossErrorBody
    } catch {
      /* swallow */
    }
    throw new TossError(
      res.status,
      body.code ?? `http_${res.status}`,
      body.message ?? res.statusText,
    )
  }
  return (await res.json()) as T
}

// ---------- payments ----------

export interface TossPayment {
  paymentKey: string
  orderId: string
  status:
    | "READY"
    | "IN_PROGRESS"
    | "WAITING_FOR_DEPOSIT"
    | "DONE"
    | "CANCELED"
    | "PARTIAL_CANCELED"
    | "ABORTED"
    | "EXPIRED"
  totalAmount: number
  approvedAt?: string
  card?: { number?: string; company?: string }
  /** 빌링키 자동결제 시 발급된 키 — issueBillingKey 흐름과는 별도. */
  customerKey?: string
}

/** 표준 결제창 완료 후 confirm — 결제 금액 위변조 방지 위해 amount 검증 필수. */
export async function confirmPayment(input: {
  paymentKey: string
  orderId: string
  amount: number
}): Promise<TossPayment> {
  return request<TossPayment>("/v1/payments/confirm", {
    method: "POST",
    body: input,
    idempotencyKey: input.orderId,
  })
}

export async function getPayment(paymentKey: string): Promise<TossPayment> {
  return request<TossPayment>(`/v1/payments/${paymentKey}`, { method: "GET" })
}

// ---------- billing key (자동 결제) ----------

export interface TossBillingKeyIssued {
  customerKey: string
  billingKey: string
  authenticatedAt: string
}

/** 카드 인증 후 빌링키 발급 — authKey 는 클라가 받은 것. */
export async function issueBillingKey(input: {
  authKey: string
  customerKey: string
}): Promise<TossBillingKeyIssued> {
  return request<TossBillingKeyIssued>("/v1/billing/authorizations/issue", {
    method: "POST",
    body: input,
  })
}

/** 저장된 billingKey 로 청구 — cron renewal 용. */
export async function chargeBillingKey(input: {
  billingKey: string
  customerKey: string
  amount: number
  orderId: string
  orderName: string
}): Promise<TossPayment> {
  const { billingKey, ...body } = input
  return request<TossPayment>(`/v1/billing/${billingKey}`, {
    method: "POST",
    body,
    idempotencyKey: input.orderId,
  })
}
