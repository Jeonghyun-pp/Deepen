"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import SectionPill from "../_components/SectionPill";
import DotField from "../_components/DotField";

const solutions = [
  {
    title: "업로드 → 그래프",
    body: "강의안·논문 업로드만으로 개념 지도를 자동 생성합니다.",
  },
  {
    title: "AI 질문 에이전트",
    body: "노드를 짚으면 맥락을 이어받아 답합니다. 대화가 그래프에 쌓입니다.",
    highlighted: true,
  },
  {
    title: "이해 확인 루프",
    body: "연결이 약한 개념을 감지해 질문·복습으로 메꿉니다.",
  },
];

export default function SolutionSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Deep green panel slides up as the section enters view.
  const panelY = useTransform(scrollYProgress, [0.25, 0.6], ["60%", "0%"]);
  const panelOpacity = useTransform(scrollYProgress, [0.2, 0.45], [0, 1]);

  return (
    <section
      ref={ref}
      className="relative min-h-[140vh] px-6 pt-32 pb-40 text-[color:var(--v2-mint-deep)] overflow-hidden"
    >
      <DotField count={48} seed={7} />

      {/* intro */}
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        <SectionPill>Solutions</SectionPill>
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-5 text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05] break-keep"
        >
          흩어진 지식을{" "}
          <span className="text-[color:var(--v2-green)]">엮어내는 방식</span>
        </motion.h2>
      </div>

      {/* deep green panel */}
      <motion.div
        style={{ y: panelY, opacity: panelOpacity }}
        className="relative z-10 mt-24 max-w-[1200px] mx-auto rounded-[28px] px-8 md:px-16 py-16 md:py-20"
        /* bg set as bg class below to survive motion style merge */
      >
        <div
          className="absolute inset-0 rounded-[28px] -z-10"
          style={{
            background:
              "linear-gradient(160deg, #0F3B24 0%, #0B2A1A 70%, #051310 100%)",
            boxShadow: "0 40px 80px -20px rgba(15,59,36,0.45)",
          }}
        />
        <div className="grid md:grid-cols-[200px_1fr] gap-8 md:gap-16 items-center text-white">
          <div className="text-3xl md:text-5xl font-extrabold text-[color:var(--v2-green-soft)]">
            Deepen은
          </div>
          <div className="flex flex-col gap-8 md:gap-10">
            {solutions.map((s) => (
              <div key={s.title} className="flex items-start gap-5">
                <div className="pt-2 flex-shrink-0">
                  <span
                    className={
                      "block rounded-full bg-[color:var(--v2-green-soft)] " +
                      (s.highlighted ? "w-5 h-5" : "w-2.5 h-2.5 opacity-80")
                    }
                    style={
                      s.highlighted
                        ? {
                            boxShadow: "0 0 18px rgba(74,222,128,0.7)",
                          }
                        : undefined
                    }
                  />
                </div>
                <div>
                  <div className="text-xl md:text-2xl font-bold text-[color:var(--v2-green-soft)]">
                    {s.title}
                  </div>
                  <div className="mt-1 text-sm md:text-base text-white/70 max-w-lg">
                    {s.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
