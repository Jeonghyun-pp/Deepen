import Link from "next/link"
import UploadPanel from "@/app/_components/UploadPanel"
import { requireUser } from "@/lib/auth/require-user"

export const dynamic = "force-dynamic"

export default async function UploadPage() {
  const { user } = await requireUser()
  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="max-w-2xl mx-auto p-3 md:p-6 space-y-3">
        <header className="rounded-2xl shadow-sm bg-white px-6 py-4 flex items-center justify-between">
          <h1 className="text-base font-semibold">문서 업로드</h1>
          <Link href="/v2/home" className="text-sm text-neutral-600 underline">
            홈으로
          </Link>
        </header>

        <div className="rounded-2xl shadow-sm bg-white px-6 py-6">
          <UploadPanel userId={user.id} />
        </div>
      </div>
    </main>
  )
}
