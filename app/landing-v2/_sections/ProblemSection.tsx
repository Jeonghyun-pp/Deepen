"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import SectionPill from "../_components/SectionPill";
import KnowledgeGapsGraph from "../_components/KnowledgeGapsGraph";

const problems = [
  ["읽어도 남지 않는 강의안", "한 번 훑고 잊는 PDF 더미"],
  ["흩어진 개념", "챕터 사이 연결이 머리에만"],
  ["AI와의 단발성 대화", "맥락이 쌓이지 않음"],
  ["무엇을 모르는지 모름", "선행 지식의 공백"],
  ["검색의 한계", "키워드만으로는 부족"],
  ["복습의 부재", "망각 곡선을 그대로 맞음"],
];

export default function ProblemSection() {
  return (
    <section className="relative px-6 py-24 text-[color:var(--v2-mint-deep)]">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8 }}
        className="max-w-[1200px] mx-auto rounded-[32px] bg-white shadow-[0_40px_80px_-20px_rgba(15,59,36,0.15)] overflow-hidden"
      >
        {/* intro block (white) */}
        <div className="text-center px-8 pt-14 pb-10">
          <SectionPill>The Problem</SectionPill>
          <h2 className="mt-5 text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
            지식이 쌓이지 않는 이유는{" "}
            <span className="text-[color:var(--v2-green)]">연결의 부재</span>
          </h2>
          <p className="mt-4 text-sm md:text-base text-[color:var(--v2-mint-deep)]/70 max-w-xl mx-auto break-keep">
            읽은 PDF, 들은 강의, 쓴 필기. 각자 따로 흩어져 있는 걸 Deepen이 이어 붙입니다.
          </p>
        </div>

        {/* split block */}
        <div className="grid md:grid-cols-2 gap-0">
          {/* artwork */}
          <div className="relative min-h-[380px] md:min-h-[460px]">
            <KnowledgeGapsGraph />
            <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_20px_rgba(74,222,128,0.8)]" />
              <span className="text-white text-xl font-extrabold border-b border-white/60 pb-1">
                Knowledge Gaps
              </span>
            </div>
          </div>

          {/* bullet list */}
          <div className="bg-[color:var(--v2-mint)] p-10 md:p-12 flex flex-col justify-center">
            <h3 className="text-xl font-extrabold mb-6">학습자가 겪는 6가지</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {problems.map(([title, sub]) => (
                <li key={title} className="flex gap-2 text-sm">
                  <ChevronRight
                    size={16}
                    className="mt-0.5 flex-shrink-0 text-[color:var(--v2-green-deep)]"
                  />
                  <div>
                    <div className="font-semibold">{title}</div>
                    <div className="text-xs opacity-70">{sub}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
