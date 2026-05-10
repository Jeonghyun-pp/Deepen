"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useState } from "react";
import { markOnboarded } from "./_complete";

const STEPS = [
  { id: "profile", label: "기본 정보" },
  { id: "scope", label: "시험 범위" },
  { id: "diagnostic", label: "진단 평가" },
  { id: "route", label: "첫 루트" },
];

export function OnboardShell({
  current,
  children,
}: {
  current: "profile" | "scope" | "diagnostic" | "route";
  children: ReactNode;
}) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);
  const router = useRouter();
  const [skipping, setSkipping] = useState(false);

  const skipToHome = async () => {
    if (skipping) return;
    setSkipping(true);
    await markOnboarded();
    router.push("/v2/home");
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A2E] flex flex-col">
      {/* nav */}
      <header className="border-b border-black/5 bg-white">
        <div className="max-w-[720px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/v2" className="font-extrabold tracking-[0.18em] text-xs">
            DEEPEN<span className="opacity-40">.LAB</span>
          </Link>
          <button
            type="button"
            onClick={skipToHome}
            disabled={skipping}
            className="text-[11px] text-black/45 hover:text-black/70 disabled:opacity-40"
          >
            나중에 하기
          </button>
        </div>
      </header>

      {/* stepper */}
      <div className="border-b border-black/5 bg-white">
        <div className="max-w-[720px] mx-auto px-6 py-3">
          <div className="flex items-center gap-3">
            {STEPS.map((s, i) => {
              const passed = i < currentIdx;
              const active = i === currentIdx;
              return (
                <div key={s.id} className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold transition ${
                        active
                          ? "bg-[#15803D] text-white shadow-[0_2px_6px_rgba(21,128,61,0.3)]"
                          : passed
                            ? "bg-[#15803D]/15 text-[#15803D]"
                            : "bg-black/[0.05] text-black/40"
                      }`}
                    >
                      {passed ? "✓" : i + 1}
                    </div>
                    <span
                      className={`text-[11px] font-medium hidden sm:inline ${
                        active ? "text-[#1A1A2E]" : passed ? "text-black/60" : "text-black/35"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-px ${passed ? "bg-[#15803D]/30" : "bg-black/8"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <main className="flex-1 flex items-start justify-center pt-12 pb-20 px-6">
        <div className="w-full max-w-[640px]">{children}</div>
      </main>
    </div>
  );
}
