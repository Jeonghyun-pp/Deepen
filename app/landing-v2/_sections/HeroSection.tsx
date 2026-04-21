"use client";

import { motion } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";
import DeepenChip from "../_components/DeepenChip";
import CircuitLines from "../_components/CircuitLines";
import GlowHorizon from "../_components/GlowHorizon";

const trustBadges = [
  { label: "PDF 업로드", sub: "강의안·논문" },
  { label: "그래프 학습", sub: "개념 간 연결" },
  { label: "AI 에이전트", sub: "질문·확장" },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden text-white">
      {/* nav */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-6 max-w-[1400px] mx-auto">
        <span className="font-extrabold tracking-[0.18em] text-sm">
          DEEPEN<span className="opacity-50">.LAB</span>
        </span>
        <div className="hidden md:flex items-center gap-1 rounded-full border border-[color:var(--v2-line)] bg-[color:var(--v2-ink-soft)]/60 backdrop-blur px-2 py-1.5 text-xs">
          {["Overview", "Product", "Roadmap", "Blog"].map((item) => (
            <a
              key={item}
              href="#"
              className="px-3 py-1 rounded-full hover:bg-white/5 transition"
            >
              {item}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <a href="/login" className="px-3 py-1.5 opacity-70 hover:opacity-100">
            Log In
          </a>
          <a
            href="/graph"
            className="px-4 py-1.5 rounded-full bg-white text-black font-semibold"
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* circuit lines behind chip */}
      <div className="relative z-10 pt-14 pb-40">
        <div className="relative h-[260px]">
          <CircuitLines />
          <div className="absolute inset-0 flex items-center justify-center">
            <DeepenChip />
          </div>
        </div>

        {/* headline */}
        <div className="relative z-10 text-center px-6 mt-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05]"
          >
            지식을 <span className="text-[color:var(--v2-green-soft)]">깊이</span> 연결하다
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-5 text-base md:text-lg opacity-70 max-w-xl mx-auto break-keep"
          >
            흩어진 강의안·논문·필기를, 개념이 연결된 한 장의 그래프로.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-8 flex items-center justify-center gap-3"
          >
            <a
              href="/graph"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[color:var(--v2-green)] text-black font-semibold text-sm hover:bg-[color:var(--v2-green-soft)] transition"
            >
              <ArrowRight size={16} />
              그래프 열어보기
            </a>
            <a
              href="#cta"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/20 text-white/80 font-medium text-sm hover:bg-white/5 transition"
            >
              베타 초대 신청
            </a>
          </motion.div>
        </div>

        {/* trust row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="relative z-10 mt-20 flex flex-col items-center gap-4"
        >
          <span className="text-xs opacity-50 tracking-widest">
            Q2 2026 베타 오픈
          </span>
          <div className="flex gap-3">
            {trustBadges.map((b) => (
              <div
                key={b.label}
                className="w-[120px] rounded-xl border border-[color:var(--v2-line)] bg-[color:var(--v2-ink-soft)]/70 backdrop-blur p-3 flex flex-col gap-2"
              >
                <ExternalLink size={14} className="opacity-60" />
                <div>
                  <div className="text-xs font-semibold">{b.label}</div>
                  <div className="text-[10px] opacity-50">{b.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <GlowHorizon />
    </section>
  );
}
