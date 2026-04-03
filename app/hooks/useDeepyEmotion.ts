"use client";

import { useEffect, useState } from "react";
import { Emotion } from "@/app/components/Deepy";
import { SectionId } from "./useScrollSection";

const sectionEmotionMap: Record<SectionId, Emotion> = {
  hero: "sparkle",
  problem: "confused",
  steps: "thinking",
  solution: "focus",
  layerDetail: "focus",
  cards: "fire",
  persona: "love",
  stats: "surprised",
  cta: "love",
  faq: "thinking",
  footer: "sleepy",
};

export function useDeepyEmotion(activeSection: SectionId): Emotion {
  const [emotion, setEmotion] = useState<Emotion>("sparkle");

  useEffect(() => {
    if (activeSection === "problem") {
      setEmotion("confused");
      const timer = setTimeout(() => setEmotion("sad"), 2000);
      return () => clearTimeout(timer);
    }

    setEmotion(sectionEmotionMap[activeSection]);
  }, [activeSection]);

  return emotion;
}
