/**
 * Toss Payments JS SDK lazy loader — 클라이언트 전용.
 * 결제 클릭 시점에 1회만 로드. 이미 있으면 즉시 resolve.
 */

const SDK_SRC = "https://js.tosspayments.com/v1/payment"

interface TossPaymentsRequest {
  amount: number
  orderId: string
  orderName: string
  customerKey?: string
  customerName?: string
  successUrl: string
  failUrl: string
}

interface TossPaymentsInstance {
  requestPayment(method: string, request: TossPaymentsRequest): Promise<void>
}

interface TossPaymentsGlobal {
  (clientKey: string): TossPaymentsInstance
}

declare global {
  interface Window {
    TossPayments?: TossPaymentsGlobal
  }
}

let loadPromise: Promise<TossPaymentsGlobal> | null = null

export function loadTossPayments(): Promise<TossPaymentsGlobal> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("toss_sdk_server_only"))
  }
  if (window.TossPayments) return Promise.resolve(window.TossPayments)
  if (loadPromise) return loadPromise

  loadPromise = new Promise<TossPaymentsGlobal>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SDK_SRC}"]`,
    )
    const onload = () => {
      if (window.TossPayments) resolve(window.TossPayments)
      else reject(new Error("toss_sdk_missing_global"))
    }
    if (existing) {
      existing.addEventListener("load", onload, { once: true })
      existing.addEventListener(
        "error",
        () => reject(new Error("toss_sdk_load_failed")),
        { once: true },
      )
      return
    }
    const script = document.createElement("script")
    script.src = SDK_SRC
    script.async = true
    script.onload = onload
    script.onerror = () => reject(new Error("toss_sdk_load_failed"))
    document.head.appendChild(script)
  })
  return loadPromise
}
