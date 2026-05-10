"use client";

import { useState } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { OnboardShell } from "../_shell";
import { PrimaryButton, SecondaryButton, Chip } from "../../_components/ui";

const SUBJECTS = [
  { id: "math2", label: "수학Ⅱ", units: ["함수의 극한", "미분", "적분"] },
  { id: "calc", label: "미적분", units: ["수열의 극한", "미분법", "적분법"] },
  { id: "stat", label: "확률과 통계", units: ["순열·조합", "확률", "통계"] },
  { id: "geom", label: "기하", units: ["이차곡선", "공간도형", "벡터"] },
];

const SCOPES = [
  { id: "5y", label: "최근 5개년 수능 + 6모/9모", recommended: true },
  { id: "10y", label: "최근 10개년" },
  { id: "specific", label: "특정 연도 선택" },
  { id: "all", label: "전체 (기간 무관)" },
];

const GOALS = [
  { id: "concept", label: "개념 복습" },
  { id: "exam", label: "기출 풀이" },
  { id: "weak", label: "약점 보완" },
  { id: "killer", label: "킬러 대비" },
  { id: "wrong", label: "오답 복구" },
];

export default function OnboardScope() {
  const [subjects, setSubjects] = useState<Set<string>>(new Set(["math2"]));
  const [units, setUnits] = useState<Set<string>>(new Set(["미분"]));
  const [scope, setScope] = useState<string>("5y");
  const [goals, setGoals] = useState<Set<string>>(new Set(["weak", "killer"]));

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void) => (id: string) => {
    const n = new Set(set);
    n.has(id) ? n.delete(id) : n.add(id);
    setter(n);
  };

  const allUnits = SUBJECTS.filter((s) => subjects.has(s.id)).flatMap((s) => s.units);

  return (
    <OnboardShell current="scope">
      <div className="space-y-8">
        <header>
          <div className="text-[10px] uppercase tracking-widest text-black/45 mb-2">
            Step 2 of 4
          </div>
          <h1 className="text-3xl font-bold tracking-tight">학습 범위를 정해 주세요</h1>
          <p className="mt-2 text-sm text-black/55">
            언제든 다시 바꿀 수 있어요. 지금은 가장 가까운 시험 기준으로 골라도 됩니다.
          </p>
        </header>

        <section>
          <label className="text-xs font-semibold text-black/70 mb-3 block">
            과목 <span className="text-black/40 font-normal">(중복 선택)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((s) => (
              <Chip
                key={s.id}
                active={subjects.has(s.id)}
                onClick={() => toggle(subjects, setSubjects)(s.id)}
              >
                {s.label}
              </Chip>
            ))}
          </div>
        </section>

        {allUnits.length > 0 && (
          <section>
            <label className="text-xs font-semibold text-black/70 mb-3 block">
              세부 단원
            </label>
            <div className="flex flex-wrap gap-2">
              {allUnits.map((u) => (
                <Chip
                  key={u}
                  active={units.has(u)}
                  onClick={() => toggle(units, setUnits)(u)}
                >
                  {u}
                </Chip>
              ))}
            </div>
          </section>
        )}

        <section>
          <label className="text-xs font-semibold text-black/70 mb-3 block">시험 범위</label>
          <div className="space-y-2">
            {SCOPES.map((sc) => {
              const active = scope === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => setScope(sc.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition ${
                    active
                      ? "border-[#15803D] bg-[#F0FDF4]"
                      : "border-black/8 bg-white hover:border-black/15"
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      active ? "border-[#15803D]" : "border-black/20"
                    }`}
                  >
                    {active && <div className="h-2 w-2 rounded-full bg-[#15803D]" />}
                  </div>
                  <span className="text-sm font-medium flex-1">{sc.label}</span>
                  {sc.recommended && (
                    <span className="text-[10px] font-semibold text-[#15803D] bg-[#ECFDF5] border border-[#15803D]/20 px-2 py-0.5 rounded-full">
                      추천
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <label className="text-xs font-semibold text-black/70 mb-3 block">
            학습 목표 <span className="text-black/40 font-normal">(중복)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <Chip
                key={g.id}
                active={goals.has(g.id)}
                onClick={() => toggle(goals, setGoals)(g.id)}
              >
                {g.label}
              </Chip>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between pt-4">
          <SecondaryButton href="/v2/onboard/profile" size="md">
            <ArrowLeft size={13} />
            이전
          </SecondaryButton>
          <PrimaryButton href="/v2/onboard/diagnostic" size="lg">
            다음
            <ArrowRight size={14} />
          </PrimaryButton>
        </div>
      </div>
    </OnboardShell>
  );
}
