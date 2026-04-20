"use client"

import Link from "next/link"
import UploadPanel from "@/app/_components/UploadPanel"

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="max-w-2xl mx-auto p-3 md:p-6 space-y-3">
        <header className="rounded-2xl shadow-sm bg-white px-6 py-4 flex items-center justify-between">
          <h1 className="text-base font-semibold">문서 업로드</h1>
          <Link href="/graph" className="text-sm text-neutral-600 underline">
            그래프로 돌아가기
          </Link>
        </header>

        <div className="rounded-2xl shadow-sm bg-white px-6 py-6">
          <UploadPanel />
        </div>
      </div>
    </main>
  )
}
