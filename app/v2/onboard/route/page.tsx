"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Sparkles, Check, Brain, BookOpen, Play, AlertTriangle } from "lucide-react";
import { OnboardShell } from "../_shell";
import { markOnboarded } from "../_complete";
import { Card, PrimaryButton, SecondaryButton, MasteryBar } from "../../_components/ui";

const ROUTE = [
  { n: 1, kind: "리캡", title: "이차방정식의 판별식", subtitle: "중3 · 2분", accent: "#7C3AED" },
  { n: 2, kind: "미니 문제", title: "중근 조건 적용", subtitle: "1문제 · 1분", accent: "#7C3AED" },
  { n: 3, kind: "유형 풀이", title: "곡선 밖 접선 — 쉬움", subtitle: "2문제 · 5분", accent: "#15803D" },
  { n: 4, kind: "기출", title: "2024 6모 14번", subtitle: "8분 예상", accent: "#15803D" },
];

export default function OnboardRoute() {
  const router = useRouter();
  const [busy, setBusy] = useState<"home" | "start" | null>(null);

  const finish = async (target: "home" | "start") => {
    if (busy) return;
    setBusy(target);
    await markOnboarded();
    router.push(target === "home" ? "/v2/home" : "/v2/recap/discriminant");
  };

  return (
    <OnboardShell current="route">
      <div className="space-y-8">
        <header className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#15803D]/20 bg-[#ECFDF5] px-3 py-1 text-[11px] font-semibold text-[#15803D] mb-4">
            <Sparkles size={11} />
            진단 분석 완료
          </div>
          <h1 className="text-3xl font-bold tracking-tight break-keep">
            정현 님의 첫 학습 루트가 준비됐어요
          </h1>
          <p className="mt-2 text-sm text-black/55">
            가장 약한 유형 1개와 결손 의심 1개를 함께 점검합니다.
          </p>
        </header>

        {/* Diagnosis summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="p-4">
            <div className="text-[10px] uppercase tracking-widest text-black/40 mb-2">
              진단 결과
            </div>
            <div className="text-xl font-bold mb-1">3 / 5</div>
            <div className="text-[11px] text-black/55">정답 · 1개는 헷갈림</div>
          </Card>
          <Card className="p-4 border-rose-200 bg-rose-50/50">
            <div className="text-[10px] uppercase tracking-widest text-rose-600 mb-2">
              가장 약한 유형
            </div>
            <div className="text-base font-bold mb-1">곡선 밖 접선</div>
            <MasteryBar value={0.4} weak size="sm" />
          </Card>
          <Card className="p-4 border-[#7C3AED]/20 bg-[#FAF5FF]">
            <div className="text-[10px] uppercase tracking-widest text-[#6D28D9] mb-2 flex items-center gap-1">
              <AlertTriangle size={9} />
              결손 의심
            </div>
            <div className="text-base font-bold mb-1">판별식</div>
            <div className="text-[11px] text-[#5B21B6]">중3 · 우선 복구</div>
          </Card>
        </div>

        {/* Route preview */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Brain size={13} className="text-[#15803D]" />
              첫 학습 루트
            </h2>
            <span className="text-[11px] text-black/45">4단계 · 약 16분</span>
          </div>

          <div className="space-y-2">
            {ROUTE.map((s) => (
              <Card key={s.n} className="px-4 py-3.5 flex items-center gap-4">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: s.accent }}
                >
                  {s.n}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: s.accent }}
                    >
                      {s.kind}
                    </span>
                    <span className="text-black/30">·</span>
                    <span className="text-[11px] text-black/45">{s.subtitle}</span>
                  </div>
                  <div className="text-sm font-semibold">{s.title}</div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* What you get */}
        <Card className="p-5 bg-[#F8F9F6] border-black/6">
          <div className="text-xs font-semibold mb-3">루트가 끝나면 이렇게 돼요</div>
          <div className="space-y-2 text-sm text-black/75">
            <Bullet>곡선 밖 접선 유형 숙련도 41% → 약 55% 예상</Bullet>
            <Bullet>판별식 결손 표시 해제 (확인 퀴즈 통과 시)</Bullet>
            <Bullet>학습 지도에 첫 약점·결손 데이터가 채워집니다</Bullet>
          </div>
        </Card>

        <div className="flex items-center justify-between pt-2">
          <SecondaryButton onClick={() => finish("home")} size="md" disabled={busy !== null}>
            건너뛰고 홈으로
          </SecondaryButton>
          <PrimaryButton onClick={() => finish("start")} size="lg" disabled={busy !== null}>
            <Play size={14} />
            루트 시작하기
          </PrimaryButton>
        </div>
      </div>
    </OnboardShell>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Check size={14} className="text-[#15803D] mt-0.5 flex-shrink-0" />
      <span className="break-keep">{children}</span>
    </div>
  );
}
