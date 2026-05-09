/**
 * /v2/settings/parents — 보호자 등록 / 상태 / 해지.
 * Spec: 09-q3-build.md M3.4.
 */
import Link from "next/link"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { requireUser } from "@/lib/auth/require-user"
import { ParentForm } from "./ParentForm"

export const dynamic = "force-dynamic"

export default async function ParentSettingsPage() {
  const { user } = await requireUser()
  const [row] = await db
    .select({
      parentEmail: users.parentEmail,
      parentConsentAt: users.parentConsentAt,
      parentUnsubscribedAt: users.parentUnsubscribedAt,
      lastParentReportSentAt: users.lastParentReportSentAt,
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  const status = (() => {
    if (!row?.parentEmail) return "none"
    if (row.parentUnsubscribedAt) return "unsubscribed"
    if (row.parentConsentAt) return "active"
    return "pending"
  })()

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="flex items-center justify-between border-b border-black/5 pb-4">
          <div>
            <Link
              href="/v2/home"
              className="text-[11px] uppercase tracking-widest text-black/45 hover:text-black/70"
            >
              ← 홈
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-black/85">
              보호자 학습 리포트
            </h1>
            <p className="mt-1 text-xs text-black/55">
              매주 일요일 오전 9시(KST), 한 주 학습 요약을 보호자 이메일로
              자동 발송합니다.
            </p>
          </div>
        </header>

        <section className="rounded-xl border border-black/10 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-black/80">
            현재 상태
          </h2>
          {status === "none" && (
            <p className="text-sm text-black/55">
              아직 등록된 보호자가 없습니다. 아래에 보호자 이메일을 입력해
              주세요.
            </p>
          )}
          {status === "pending" && (
            <p
              className="text-sm text-amber-800"
              data-testid="parent-status-pending"
            >
              <span className="font-medium">{row?.parentEmail}</span> 으로
              동의 메일을 발송했습니다. 보호자가 메일의 동의 버튼을 눌러
              주시면 다음 일요일부터 리포트가 발송됩니다.
            </p>
          )}
          {status === "active" && (
            <p
              className="text-sm text-emerald-800"
              data-testid="parent-status-active"
            >
              <span className="font-medium">{row?.parentEmail}</span> 의
              동의가 완료되어 매주 리포트가 발송되고 있습니다.
              {row?.lastParentReportSentAt && (
                <span className="ml-2 text-[11px] text-emerald-700/70">
                  최근 발송:{" "}
                  {new Date(row.lastParentReportSentAt).toLocaleDateString(
                    "ko-KR",
                  )}
                </span>
              )}
            </p>
          )}
          {status === "unsubscribed" && (
            <p
              className="text-sm text-black/55"
              data-testid="parent-status-unsubscribed"
            >
              보호자가 발송을 해지하셨습니다. 다시 받으시려면 아래에 다시
              등록해 주세요.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-black/10 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-black/80">
            보호자 이메일 등록 / 변경
          </h2>
          <ParentForm currentEmail={row?.parentEmail ?? null} />
          <p className="mt-3 text-[11px] text-black/45">
            등록 후 보호자가 1회 동의해야 발송이 시작됩니다. 동의 메일은 7일
            후 만료되며 다시 등록하면 새 메일이 발송됩니다.
          </p>
        </section>

        <section className="rounded-xl border border-black/10 bg-white p-5 text-xs text-black/55">
          <p>
            <strong className="text-black/75">개인정보 안내</strong> · 보호자
            이메일은 주간 리포트 발송에만 사용됩니다. 모든 메일 푸터의 1-click
            해지 링크로 즉시 발송 종료가 가능합니다.
          </p>
        </section>
      </div>
    </main>
  )
}
