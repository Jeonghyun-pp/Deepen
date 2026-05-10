"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles, Target } from "lucide-react";
import { OnboardShell } from "../_shell";
import { Card, PrimaryButton, SecondaryButton } from "../../_components/ui";

const QUESTIONS = [
  {
    id: 1,
    pattern: "곡선 위 접선",
    text: "곡선 y = x² 위의 점 (1, 1) 에서의 접선의 기울기는?",
    options: ["1", "2", "3", "4"],
    answer: "2",
  },
  {
    id: 2,
    pattern: "미분계수",
    text: "f(x) = x³ 일 때 f'(2) 의 값은?",
    options: ["6", "8", "10", "12"],
    answer: "12",
  },
  {
    id: 3,
    pattern: "극값",
    text: "f(x) = x³ − 3x 가 극값을 가지는 x 의 개수는?",
    options: ["0개", "1개", "2개", "3개"],
    answer: "2개",
  },
  {
    id: 4,
    pattern: "판별식 (선행)",
    text: "x² − 4x + k = 0 이 중근을 가질 때 k 의 값은?",
    options: ["1", "2", "3", "4"],
    answer: "4",
  },
  {
    id: 5,
    pattern: "그래프 개형",
    text: "f(x) = x³ − 3x² + 2 의 그래프에서 변곡점의 x 좌표는?",
    options: ["0", "1", "2", "3"],
    answer: "1",
  },
];

export default function OnboardDiagnostic() {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [confidence, setConfidence] = useState<Record<number, "sure" | "shaky">>({});

  const q = QUESTIONS[idx];
  const isLast = idx === QUESTIONS.length - 1;

  const next = () => {
    if (isLast) return;
    setIdx(idx + 1);
  };

  if (idx === -1) {
    return <Intro onStart={() => setIdx(0)} />;
  }

  return (
    <OnboardShell current="diagnostic">
      <div className="space-y-8">
        {/* progress */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-black/45 mb-1">
              진단 평가 · {idx + 1} / {QUESTIONS.length}
            </div>
            <div className="text-[11px] text-[#15803D] font-medium">
              {q.pattern}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full ${
                  i < idx
                    ? "bg-[#15803D]"
                    : i === idx
                      ? "bg-[#15803D]/40"
                      : "bg-black/10"
                }`}
              />
            ))}
          </div>
        </div>

        <Card className="p-6">
          <div className="text-base font-medium leading-relaxed text-black/85 mb-6 break-keep">
            {q.text}
          </div>

          <div className="space-y-2">
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition ${
                    selected
                      ? "border-[#15803D] bg-[#F0FDF4]"
                      : "border-black/8 bg-white hover:border-black/15"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selected ? "border-[#15803D] bg-[#15803D]" : "border-black/20"
                    }`}
                  >
                    {selected && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-sm font-mono">{opt}</span>
                </button>
              );
            })}
          </div>

          {answers[q.id] && (
            <div className="mt-5 pt-5 border-t border-black/5">
              <div className="text-[11px] text-black/55 mb-2">자신감</div>
              <div className="flex gap-2">
                {(["sure", "shaky"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setConfidence({ ...confidence, [q.id]: c })}
                    className={`flex-1 px-3 py-2 rounded-lg border text-xs transition ${
                      confidence[q.id] === c
                        ? c === "sure"
                          ? "border-[#15803D] bg-[#F0FDF4] text-[#15803D] font-semibold"
                          : "border-amber-300 bg-amber-50 text-amber-700 font-semibold"
                        : "border-black/8 bg-white text-black/60 hover:border-black/15"
                    }`}
                  >
                    {c === "sure" ? "확신 있음" : "헷갈렸음"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="flex items-center justify-between">
          <SecondaryButton
            onClick={() => (idx === 0 ? null : setIdx(idx - 1))}
            size="md"
          >
            <ArrowLeft size={13} />
            이전
          </SecondaryButton>

          <div className="flex items-center gap-2">
            {!isLast ? (
              <PrimaryButton onClick={next} size="lg">
                다음
                <ArrowRight size={14} />
              </PrimaryButton>
            ) : (
              <PrimaryButton href="/v2/onboard/route" size="lg">
                결과 보기
                <Sparkles size={14} />
              </PrimaryButton>
            )}
          </div>
        </div>

        <div className="text-center pt-4">
          <a
            href="/v2/onboard/route"
            className="text-[11px] text-black/45 hover:text-black/70 transition"
          >
            진단 평가 건너뛰기 →
          </a>
        </div>
      </div>
    </OnboardShell>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <OnboardShell current="diagnostic">
      <div className="text-center space-y-6 pt-6">
        <div className="inline-flex h-14 w-14 rounded-full bg-[#ECFDF5] items-center justify-center mx-auto">
          <Target size={22} className="text-[#15803D]" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight break-keep">
          5분 진단 평가
        </h1>
        <p className="text-sm text-black/60 leading-relaxed max-w-[400px] mx-auto break-keep">
          지금 어떤 유형이 강하고 약한지 빠르게 파악합니다. 5문제 · 약 5분.
          <br />
          건너뛰어도 되지만, 첫 추천 정확도가 떨어질 수 있어요.
        </p>
        <div className="flex items-center justify-center gap-2 pt-4">
          <SecondaryButton href="/v2/onboard/route" size="md">건너뛰기</SecondaryButton>
          <PrimaryButton onClick={onStart} size="lg">
            <Sparkles size={14} />
            진단 시작
          </PrimaryButton>
        </div>
      </div>
    </OnboardShell>
  );
}
