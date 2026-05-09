"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface ParentFormProps {
  currentEmail: string | null
}

export function ParentForm({ currentEmail }: ParentFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState(currentEmail ?? "")
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<
    | { kind: "ok"; dryRun: boolean }
    | { kind: "err"; message: string }
    | null
  >(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || busy) return
    setBusy(true)
    setFeedback(null)
    try {
      const res = await fetch("/api/parents/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      })
      const data = (await res.json()) as {
        ok: boolean
        dryRun?: boolean
        error?: string | null
      }
      if (!res.ok || !data.ok) {
        setFeedback({
          kind: "err",
          message: data.error ?? "등록에 실패했습니다.",
        })
        return
      }
      setFeedback({ kind: "ok", dryRun: !!data.dryRun })
      router.refresh()
    } catch (err) {
      setFeedback({ kind: "err", message: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="parent-email" className="text-xs text-black/55">
        보호자 이메일
      </label>
      <div className="flex gap-2">
        <input
          id="parent-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="parent@example.com"
          data-testid="parent-email-input"
          className="flex-1 rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:border-black/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !email}
          data-testid="parent-submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "보내는 중…" : "동의 메일 보내기"}
        </button>
      </div>
      {feedback?.kind === "ok" && (
        <p className="text-xs text-emerald-700">
          {feedback.dryRun
            ? "(dev) 메일 발송이 dryRun 모드입니다. RESEND_API_KEY 설정 후 실제 발송됩니다."
            : "동의 메일을 발송했습니다. 보호자가 메일을 확인하면 등록이 완료됩니다."}
        </p>
      )}
      {feedback?.kind === "err" && (
        <p className="text-xs text-rose-700">{feedback.message}</p>
      )}
    </form>
  )
}
