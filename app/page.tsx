"use client";

import { useState } from "react";
import Deepy, { Emotion, DeepyConfig, defaultConfig } from "./components/Deepy";
import DesignPanel from "./components/DesignPanel";

const emotions: { key: Emotion; label: string; emoji: string; desc: string }[] = [
  { key: "sparkle", label: "반짝", emoji: "👀", desc: "새 논문 발견 — 호기심이 반짝이는 순간" },
  { key: "focus", label: "집중", emoji: "🤓", desc: "학습 중 — 깊이 몰입하는 상태" },
  { key: "celebrate", label: "축하", emoji: "🎉", desc: "이해 완료 — 성취감 폭발" },
  { key: "sad", label: "기다림", emoji: "😔", desc: "이탈 알림 — '어제 발견한 거 궁금하지 않아?'" },
  { key: "fire", label: "불꽃", emoji: "🔥", desc: "스트릭 유지 — 연속 학습의 열정" },
  { key: "confused", label: "혼란", emoji: "😵‍💫", desc: "어려운 논문 — '이게 뭐지?' 하는 순간" },
  { key: "sleepy", label: "졸림", emoji: "😴", desc: "야간 알림 — 부드러운 리마인더" },
  { key: "surprised", label: "놀람", emoji: "😲", desc: "예상 못한 발견 — 인사이트의 충격" },
  { key: "love", label: "좋아요", emoji: "😍", desc: "북마크/저장 — 마음에 쏙 드는 논문" },
  { key: "thinking", label: "생각중", emoji: "🤔", desc: "로딩/처리 — 답을 찾는 중..." },
];

export default function Home() {
  const [emotion, setEmotion] = useState<Emotion>("sparkle");
  const [config, setConfig] = useState<DeepyConfig>(defaultConfig);
  const [showPanel, setShowPanel] = useState(true);

  const currentEmotion = emotions.find((e) => e.key === emotion)!;

  return (
    <div className="flex min-h-screen">
      {/* Main content — center */}
      <div className="flex-1 flex flex-col items-center justify-center py-10 px-6 gap-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#f5f5f7] tracking-tight">
            Deepy <span className="text-[#00e5cc]">Character Lab</span>
          </h1>
          <p className="text-[#6b7280] mt-2 text-sm">
            감정 10가지 테스트 · 색상 프리셋 · 디자인 커스터마이즈
          </p>
        </div>

        {/* Stage */}
        <div className="relative flex items-center justify-center" style={{ minWidth: 300, minHeight: 340 }}>
          <div
            className="absolute rounded-full blur-3xl opacity-20 transition-colors duration-700"
            style={{
              width: 200,
              height: 200,
              background: config.lensGlow,
            }}
          />
          <Deepy emotion={emotion} config={config} />
        </div>

        {/* Current emotion label */}
        <div className="text-center">
          <span className="text-2xl mr-2">{currentEmotion.emoji}</span>
          <span className="text-lg font-semibold text-[#f5f5f7]">{currentEmotion.label}</span>
        </div>

        {/* Emotion grid - 2 rows of 5 */}
        <div className="grid grid-cols-5 gap-2.5 max-w-lg">
          {emotions.map((e) => {
            const isActive = emotion === e.key;
            return (
              <button
                key={e.key}
                onClick={() => setEmotion(e.key)}
                className={`
                  flex flex-col items-center gap-1 px-3 py-3 rounded-xl text-xs font-medium
                  transition-all duration-200 cursor-pointer select-none
                  ${isActive
                    ? "bg-[#4a90ff] text-white"
                    : "bg-[#1a1a40] text-[#6b7280] hover:bg-[#2a2a5a] hover:text-[#f5f5f7] border border-[#2a2a5a]"
                  }
                `}
                style={{
                  boxShadow: isActive
                    ? "0 4px 0 #3570cc, 0 6px 12px rgba(74,144,255,0.25)"
                    : "0 4px 0 #12122a",
                  transform: "translateY(0)",
                }}
                onMouseDown={(ev) => {
                  ev.currentTarget.style.transform = "translateY(4px)";
                  ev.currentTarget.style.boxShadow = "0 0 0 transparent";
                }}
                onMouseUp={(ev) => {
                  ev.currentTarget.style.transform = "translateY(0)";
                  ev.currentTarget.style.boxShadow = isActive
                    ? "0 4px 0 #3570cc, 0 6px 12px rgba(74,144,255,0.25)"
                    : "0 4px 0 #12122a";
                }}
                onMouseLeave={(ev) => {
                  ev.currentTarget.style.transform = "translateY(0)";
                  ev.currentTarget.style.boxShadow = isActive
                    ? "0 4px 0 #3570cc, 0 6px 12px rgba(74,144,255,0.25)"
                    : "0 4px 0 #12122a";
                }}
              >
                <span className="text-lg">{e.emoji}</span>
                <span>{e.label}</span>
              </button>
            );
          })}
        </div>

        {/* Description */}
        <p className="text-sm text-[#6b7280] text-center max-w-md">
          {currentEmotion.desc}
        </p>
      </div>

      {/* Design panel — fixed right sidebar */}
      <div className="sticky top-0 h-screen flex flex-col border-l border-[#2a2a5a]">
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="p-3 text-xs text-[#6b7280] hover:text-[#00e5cc] transition-colors cursor-pointer text-right"
        >
          {showPanel ? "패널 숨기기 ✕" : "✎"}
        </button>
        {showPanel && (
          <div className="overflow-y-auto flex-1">
            <DesignPanel config={config} onChange={setConfig} />
          </div>
        )}
      </div>
    </div>
  );
}
