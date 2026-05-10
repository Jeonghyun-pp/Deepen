/**
 * /v2/billing/fail — Toss 결제창 fail redirect.
 * Spec: 09-q3-build.md M3.1.
 *
 * Toss 가 ?code=&message=&orderId= 로 redirect 하면 그대로 안내.
 */

import Link from "next/link"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{ code?: string; message?: string; orderId?: string }>
}

export default async function BillingFailPage({ searchParams }: Props) {
  const sp = await searchParams
  const code = sp.code ?? "unknown"
  const message = sp.message ?? "결제가 완료되지 않았어요."

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <div className="mx-auto flex max-w-xl flex-col gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h1 className="text-lg font-semibold text-rose-900">결제 실패</h1>
        <p className="text-sm text-rose-800">{message}</p>
        <p className="text-xs text-rose-700">
          에러 코드: <code className="font-mono">{code}</code>
        </p>
        <div className="mt-2 flex gap-2">
          <Link
            href="/v2/billing"
            className="rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800"
          >
            다시 시도
          </Link>
          <Link
            href="/v2/home"
            className="rounded-md border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-900 hover:bg-rose-50"
          >
            홈으로
          </Link>
        </div>
      </div>
    </main>
  )
}
