"use client"

import { useRouter } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

export function LogoutButton() {
  const router = useRouter()
  const handleLogout = async () => {
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
