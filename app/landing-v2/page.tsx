"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import HeroSection from "./_sections/HeroSection";
import ProblemSection from "./_sections/ProblemSection";
import SolutionSection from "./_sections/SolutionSection";
import CtaSection from "./_sections/CtaSection";
import FooterSection from "./_sections/FooterSection";

export default function LandingV2Page() {
  const pageRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: pageRef });

  // Page background morph across the whole scroll:
  //   hero (dark) → problem·solution (light) → cta·footer (dark again).
  const bg = useTransform(
    scrollYProgress,
    [0, 0.12, 0.2, 0.72, 0.82, 1],
    ["#050807", "#050807", "#FFFFFF", "#FFFFFF", "#050807", "#050807"],
  );

  return (
    <div ref={pageRef} className="relative">
      <motion.div
        aria-hidden
        style={{ backgroundColor: bg }}
        className="fixed inset-0 -z-10"
      />
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <CtaSection />
      <FooterSection />
    </div>
  );
}
