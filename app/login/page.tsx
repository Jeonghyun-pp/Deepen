"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowRight, Mail, CheckCircle2 } from "lucide-react"
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
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[color:var(--v2-green)]/15 border border-[color:var(--v2-green)]/40 mb-6">
          <CheckCircle2 size={26} className="text-[color:var(--v2-green-soft)]" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.1]">
          메일함을{" "}
          <span className="text-[color:var(--v2-green-soft)]">확인</span>해주세요
        </h1>
        <p className="mt-5 text-sm md:text-base text-white/70">
          <span className="text-white">{email}</span> 로 로그인 링크를 보냈어요.
          <br />
          링크를 클릭하면 자동으로 돌아옵니다.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle")
            setEmail("")
          }}
          className="mt-8 text-xs text-white/50 hover:text-white/80 underline underline-offset-4 transition"
        >
          다른 이메일로 다시 보내기
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-10">
        <span className="inline-block px-3.5 py-1 rounded-full text-[10px] font-semibold border border-white/20 text-white/80 tracking-[0.18em]">
          LOGIN
        </span>
        <h1 className="mt-5 text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.1]">
          <span className="text-[color:var(--v2-green-soft)]">Deepen</span>{" "}
          시작하기
        </h1>
        <p className="mt-4 text-sm text-white/60">
          이메일로 로그인 링크를 보내드려요 — 비밀번호는 없습니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Mail
            size={14}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            disabled={status === "sending"}
            className="w-full pl-10 pr-5 py-3.5 rounded-full bg-white/10 border border-white/20 backdrop-blur text-sm placeholder:text-white/40 focus:outline-none focus:border-[color:var(--v2-green-soft)] transition disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={status === "sending" || !email}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[color:var(--v2-green)] text-black font-semibold text-sm hover:bg-[color:var(--v2-green-soft)] disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {status === "sending" ? (
            "보내는 중..."
          ) : (
            <>
              <ArrowRight size={16} />
              로그인 링크 받기
            </>
          )}
        </button>

        {status === "error" && (
          <p className="text-xs text-rose-400 text-center pt-1">{error}</p>
        )}
      </form>

      <p className="mt-8 text-center text-[11px] text-white/40">
        계정이 없어도 이메일만 입력하면 바로 시작할 수 있어요.
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden bg-[color:var(--v2-ink)] text-white">
      {/* Radial green glow backdrop — echoes landing CTA section */}
      <div
        aria-hidden
        className="absolute inset-x-6 inset-y-0 -z-10 rounded-[32px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 35%, #15803D 0%, #0F3B24 40%, #050807 90%)",
        }}
      />

      {/* Brand mark top-left */}
      <a
        href="/"
        className="absolute top-6 left-8 text-xs font-extrabold tracking-[0.18em] opacity-80 hover:opacity-100 transition"
      >
        DEEPEN<span className="opacity-50">.LAB</span>
      </a>

      <Suspense
        fallback={<div className="text-sm text-white/50">…</div>}
      >
        <LoginForm />
      </Suspense>
    </main>
  )
}
