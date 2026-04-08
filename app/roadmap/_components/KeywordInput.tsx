"use client";

import { Search, ArrowRight } from "lucide-react";

interface Props {
  keyword: string;
  onKeywordChange: (value: string) => void;
  difficulty: "beginner" | "intermediate" | "advanced";
  onDifficultyChange: (value: "beginner" | "intermediate" | "advanced") => void;
  onSubmit: () => void;
  loading: boolean;
}

const DIFFICULTIES = [
  { key: "beginner" as const, label: "초급", color: "#10b981" },
  { key: "intermediate" as const, label: "중급", color: "#4A90FF" },
  { key: "advanced" as const, label: "고급", color: "#ef4444" },
];

export default function KeywordInput({
  keyword,
  onKeywordChange,
  difficulty,
  onDifficultyChange,
  onSubmit,
  loading,
}: Props) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && keyword.trim()) onSubmit();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search Input */}
      <div className="flex items-center gap-2 px-4 h-12 rounded-xl bg-white border border-border focus-within:border-coral transition-colors">
        <Search size={16} className="text-text-muted" />
        <input
          type="text"
          placeholder="예: Transformer, Diffusion, GAN..."
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-transparent outline-none text-sm flex-1 text-text-primary placeholder:text-text-muted"
        />
        <button
          onClick={onSubmit}
          disabled={!keyword.trim() || loading}
          className="flex items-center gap-1.5 px-4 h-8 rounded-lg bg-coral text-white text-sm font-bold hover:bg-coral-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>생성</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Difficulty Selection */}
      <div className="flex items-center gap-2">
        {DIFFICULTIES.map(({ key, label, color }) => {
          const active = difficulty === key;
          return (
            <button
              key={key}
              onClick={() => onDifficultyChange(key)}
              className="px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border"
              style={{
                background: active ? color + "15" : "white",
                borderColor: active ? color + "40" : "var(--border)",
                color: active ? color : "var(--text-secondary)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
