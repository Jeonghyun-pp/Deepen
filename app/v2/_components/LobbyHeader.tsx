/**
 * LobbyHeader — 통일된 lobby nav (Stage 2).
 *
 * 4개 lobby (home·notebook·stats·me) + recovery 가 동일한 nav 구성으로 통일.
 * 이전: home(footer 6링크) / notebook·me(TopNav + PrimaryNavLink 3) / stats·recovery(breadcrumb 만) — 4 가지 모양.
 * 개정: 동일 LobbyHeader 1개. 사용자는 lobby 간 이동 시 매번 새로 학습할 필요 없음.
 *
 * Server component — Link 만 사용. AI 사용량/email 등 동적 요소는 page 가 직접 렌더.
 */

import Link from "next/link"
import { BookOpen, Notebook, TrendingUp, User } from "lucide-react"

export type LobbyTab = "home" | "notebook" | "stats" | "me"

const TABS: { id: LobbyTab; href: string; label: string; Icon: typeof BookOpen }[] = [
  { id: "home", href: "/v2/home", label: "단원", Icon: BookOpen },
  { id: "notebook", href: "/v2/notebook", label: "오답노트", Icon: Notebook },
  { id: "stats", href: "/v2/stats", label: "약점·통계", Icon: TrendingUp },
  { id: "me", href: "/v2/me", label: "내 정보", Icon: User },
]

export interface LobbyHeaderProps {
  /** 현재 활성 탭 — chip 강조용. */
  active: LobbyTab
  /** 헤더 우측 슬롯 — page 가 직접 채움 (AI 사용량/email/logout 등 동적 요소). */
  rightSlot?: React.ReactNode
}

export function LobbyHeader({ active, rightSlot }: LobbyHeaderProps) {
  return (
    <header
      className="flex flex-wrap items-center justify-between gap-3 border-b border-black/8 bg-white/80 backdrop-blur px-4 sm:px-6 py-3"
      data-testid="lobby-header"
    >
      <div className="flex items-center gap-4 min-w-0">
        <Link
          href="/v2/home"
          className="font-extrabold tracking-[0.18em] text-xs text-black/85"
        >
          DEEPEN<span className="opacity-40">.LAB</span>
        </Link>
        <nav
          aria-label="lobby"
          className="flex flex-wrap items-center gap-1"
          role="tablist"
        >
          {TABS.map((t) => {
            const isActive = t.id === active
            return (
              <Link
                key={t.id}
                href={t.href}
                role="tab"
                aria-selected={isActive}
                data-testid={`lobby-tab-${t.id}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "bg-black text-white"
                    : "text-black/55 hover:bg-black/[0.04] hover:text-black/85"
                }`}
              >
                <t.Icon
                  size={12}
                  className={isActive ? "text-white" : "opacity-60"}
                />
                {t.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {rightSlot && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-black/55">
          {rightSlot}
        </div>
      )}
    </header>
  )
}
