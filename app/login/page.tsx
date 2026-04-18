"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

function LoginForm() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") ?? "/graph"

  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  )
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("sending")
    setError("")

    const supabase = createSupabaseBrowserClient()
    const redirectUrl = new URL("/auth/callback", window.location.origin)
    redirectUrl.searchParams.set("next", redirect)

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl.toString() },
    })

    if (otpError) {
      setStatus("error")
      setError(otpError.message)
    } else {
      setStatus("sent")
    }
  }

  if (status === "sent") {
    return (
      <div className="max-w-sm w-full text-center space-y-3">
        <h1 className="text-xl font-semibold">메일함 확인해주세요</h1>
        <p className="text-sm text-neutral-600">
          {email} 로 로그인 링크를 보냈습니다.
          <br />
          링크를 클릭하면 자동으로 돌아옵니다.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle")
            setEmail("")
          }}
          className="text-xs text-neutral-500 underline"
        >
          다른 이메일로 다시 보내기
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm w-full space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Deepen 로그인</h1>
        <p className="text-xs text-neutral-500">
          이메일로 로그인 링크를 보내드립니다 (비밀번호 없음).
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-xs text-neutral-600">이메일</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={status === "sending"}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={status === "sending" || !email}
        className="w-full rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {status === "sending" ? "보내는 중..." : "로그인 링크 받기"}
      </button>

      {status === "error" && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </form>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-white">
      <Suspense fallback={<div className="text-sm text-neutral-500">…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  )
}
