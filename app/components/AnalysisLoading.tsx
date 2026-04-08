"use client";

import { Loader2 } from "lucide-react";
import Deepy, { landingConfig } from "./Deepy";

interface Props {
  message?: string;
  emotion?: "thinking" | "focus";
}

export default function AnalysisLoading({ message = "논문을 분석하고 있어요...", emotion = "thinking" }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <Deepy emotion={emotion} config={{ ...landingConfig, scale: 0.6 }} />
      <p className="text-sm font-semibold text-text-secondary">{message}</p>
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Loader2 size={14} className="animate-spin" />
        <span>예상 소요: 3-5초</span>
      </div>
    </div>
  );
}
