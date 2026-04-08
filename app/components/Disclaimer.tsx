"use client";

import { Info } from "lucide-react";

interface Props {
  text?: string;
}

export default function Disclaimer({ text = "AI가 공개된 초록 기반으로 추론한 결과입니다" }: Props) {
  return (
    <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
      <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
      <p className="text-xs text-blue-700 leading-relaxed">{text}</p>
    </div>
  );
}
