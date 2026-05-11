"use client"

import { useRouter } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

export function LogoutButton() {
  const router = useRouter()
  const handleLogout = async () => {
    // P1-5 폴리싱: 우발 클릭 방지 confirm
    if (!window.confirm("로그아웃하시겠어요?")) return
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.replace("/")
    router.refresh()
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      data-testid="logout"
      className="text-black/55 hover:text-black/85 hover:underline"
    >
      로그아웃
    </button>
  )
}
