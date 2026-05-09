/**
 * /admin/seed-review — 시드 작업용 임시 어드민 화면.
 * Spec: docs/build-spec/07-q1-build.md M1.4 어드민 검수의 simplified 버전.
 *
 * Q1: 강사 외주 + 팀원 1명이 PDF 파이프라인 draft 결과를 검수·publish.
 * M2.6: 본격 어드민 화면으로 redesign.
 */

import { redirect } from "next/navigation"
import { requireUser } from "@/lib/auth/require-user"
import { isAdminEmail } from "@/lib/auth/require-admin"
import { SeedReviewClient } from "./SeedReviewClient"

export const dynamic = "force-dynamic"

export default async function SeedReviewPage() {
  const { user } = await requireUser()
  if (!isAdminEmail(user.email)) {
    redirect("/v2")
  }
  return <SeedReviewClient />
}
