"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { OnboardShell } from "../_shell";
import { Card, PrimaryButton, SecondaryButton } from "../../_components/ui";

const GRADES = [
  { id: "h1", label: "고1", desc: "수학Ⅰ·수학Ⅱ 대비" },
  { id: "h2", label: "고2", desc: "내신 + 수능 기초" },
  { id: "h3", label: "고3", desc: "수능 / 내신 마무리" },
  { id: "n", label: "N수", desc: "수능 재도전" },
];

const TARGETS = [
  { id: "suneung", label: "수능", icon: "🎯" },
  { id: "moui", label: "모의고사 6/9월", icon: "📝" },
  { id: "naesin", label: "내신", icon: "🏫" },
  { id: "nonsul", label: "논술 / 수리논술", icon: "✍️" },
];

export default function OnboardProfile() {
  const [grade, setGrade] = useState<string | null>("h2");
  const [targets, setTargets] = useState<Set<string>>(new Set(["suneung"]));
  const [name, setName] = useState("");

  const toggleTarget = (id: string) =>
    setTargets((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <OnboardShell current="profile">
      <div className="space-y-8">
        <header>
          <div className="text-[10px] uppercase tracking-widest text-black/45 mb-2">
            Step 1 of 4
          </div>
          <h1 className="text-3xl font-bold tracking-tight">먼저, 어떤 시험을 준비하나요?</h1>
          <p className="mt-2 text-sm text-black/55">학년과 목표 시험을 알려주세요. 나중에 변경할 수 있어요.</p>
        </header>

        <section>
          <label className="text-xs font-semibold text-black/70 mb-2 block">닉네임 (선택)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 정현"
            className="w-full px-3 py-2.5 rounded-lg border border-black/10 bg-white text-sm outline-none focus:border-[#15803D]/40 focus:shadow-[0_0_0_3px_rgba(21,128,61,0.08)] transition"
          />
        </section>

        <section>
          <label className="text-xs font-semibold text-black/70 mb-3 block">학년</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {GRADES.map((g) => {
              const active = grade === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setGrade(g.id)}
                  className={`text-left rounded-xl border p-4 transition ${
                    active
                      ? "border-[#15803D] bg-[#F0FDF4] shadow-[0_2px_8px_rgba(21,128,61,0.1)]"
                      : "border-black/8 bg-white hover:border-black/15"
                  }`}
                >
                  <div className="text-base font-bold mb-1">{g.label}</div>
                  <div className="text-[10px] text-black/55 leading-snug break-keep">{g.desc}</div>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <label className="text-xs font-semibold text-black/70 mb-3 block">
            목표 시험 <span className="text-black/40 font-normal">(중복 선택)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TARGETS.map((t) => {
              const active = targets.has(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTarget(t.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition ${
                    active
                      ? "border-[#15803D] bg-[#F0FDF4]"
                      : "border-black/8 bg-white hover:border-black/15"
                  }`}
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className="text-sm font-semibold flex-1 text-left">{t.label}</span>
                  {active && (
                    <span className="text-[10px] text-[#15803D] font-bold">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex items-center justify-between pt-4">
          <SecondaryButton href="/v2" size="md">취소</SecondaryButton>
          <PrimaryButton href="/v2/onboard/scope" size="lg">
            다음
            <ArrowRight size={14} />
          </PrimaryButton>
        </div>
      </div>
    </OnboardShell>
  );
}
