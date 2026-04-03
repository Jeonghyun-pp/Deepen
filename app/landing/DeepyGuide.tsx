"use client";

import { useState, useCallback, useMemo } from "react";
import Deepy, { landingConfig, DeepyConfig, Emotion } from "@/app/components/Deepy";
import SpeechBubble from "./SpeechBubble";
import { useTranslation } from "@/app/i18n/context";
import { useTheme } from "@/app/theme/context";

const themeConfigs: Record<string, Partial<DeepyConfig>> = {
  coral: {},
  ocean: {
    lensGlow: "#4A90FF",
    cheekColor: "#93BBFF",
  },
};

interface DeepyGuideProps {
  emotion: Emotion;
}

export default function DeepyGuide({ emotion }: DeepyGuideProps) {
  const { tArray } = useTranslation();
  const { themeId } = useTheme();
  const bubbles = tArray("deepy.bubbles") as string[];
  const [bubble, setBubble] = useState<string | null>(null);

  const config = useMemo<DeepyConfig>(
    () => ({ ...landingConfig, ...themeConfigs[themeId], scale: 0.7 }),
    [themeId]
  );

  const handleClick = useCallback(() => {
    const text = bubbles[Math.floor(Math.random() * bubbles.length)];
    setBubble(text);
    setTimeout(() => setBubble(null), 3000);
  }, [bubbles]);

  return (
    <div className="fixed right-8 top-1/2 -translate-y-1/2 z-40 hidden lg:block">
      <div className="relative">
        <SpeechBubble text={bubble ?? ""} visible={!!bubble} />
        <Deepy
          emotion={emotion}
          config={config}
          onClick={handleClick}
          softShadow
        />
      </div>
    </div>
  );
}
