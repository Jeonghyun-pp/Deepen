"use client"

import Link from "next/link"
import UploadPanel from "@/app/_components/UploadPanel"

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-base font-semibold">문서 업로드</h1>
        <Link href="/graph" className="text-sm text-neutral-600 underline">
          그래프로 돌아가기
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <UploadPanel />
      </div>
    </main>
  )
}
