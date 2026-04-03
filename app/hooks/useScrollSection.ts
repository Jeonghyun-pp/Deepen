"use client";

import { useEffect, useState, RefObject } from "react";

export type SectionId =
  | "hero" | "problem" | "steps" | "solution" | "layerDetail"
  | "cards" | "persona" | "stats" | "cta" | "faq" | "footer";

export function useScrollSection(refs: Record<SectionId, RefObject<HTMLElement | null>>): SectionId {
  const [active, setActive] = useState<SectionId>("hero");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    const entries = Object.entries(refs) as [SectionId, RefObject<HTMLElement | null>][];

    for (const [id, ref] of entries) {
      if (!ref.current) continue;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActive(id);
          }
        },
        { threshold: 0.3 }
      );

      observer.observe(ref.current);
      observers.push(observer);
    }

    return () => {
      observers.forEach((o) => o.disconnect());
    };
  }, [refs]);

  return active;
}
