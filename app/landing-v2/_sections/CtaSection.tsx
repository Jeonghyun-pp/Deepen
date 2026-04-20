"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

export default function CtaSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  return (
    <section
      id="cta"
      className="relative px-6 py-32 text-white overflow-hidden"
    >
      {/* local dark backdrop independent of the page bg morph */}
      <div
        className="absolute inset-x-6 inset-y-0 rounded-[32px] -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, #15803D 0%, #0F3B24 40%, #050807 90%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative max-w-3xl mx-auto text-center"
      >
        <span className="inline-block px-3.5 py-1 rounded-full text-xs font-semibold border border-white/20 text-white/80">
          Beta
        </span>
        <h2 className="mt-5 text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
          먼저{" "}
          <span className="text-[color:var(--v2-green-soft)]">Deepen</span>을
          경험해보세요
        </h2>
        <p className="mt-5 text-sm md:text-base text-white/70">
          Q2 2026 베타 오픈. 이메일을 남기시면 초대장을 보내드립니다.
        </p>

        {submitted ? (
          <div className="mt-10 inline-flex items-center gap-3 px-6 py-3 rounded-full bg-[color:var(--v2-green)]/15 border border-[color:var(--v2-green)]/40 text-[color:var(--v2-green-soft)]">
            등록 완료. 초대장을 보내드릴게요 →
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-10 flex flex-col sm:flex-row items-stretch gap-2 max-w-lg mx-auto"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 px-5 py-3.5 rounded-full bg-white/10 border border-white/20 backdrop-blur placeholder:text-white/40 focus:outline-none focus:border-[color:var(--v2-green-soft)] transition"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[color:var(--v2-green)] text-black font-semibold hover:bg-[color:var(--v2-green-soft)] transition"
            >
              <ArrowRight size={16} />
              초대장 받기
            </button>
          </form>
        )}

        <a
          href="/graph"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-[color:var(--v2-green-soft)] transition"
        >
          또는 지금 바로 그래프 써보기
          <ArrowRight size={14} />
        </a>
      </motion.div>
    </section>
  );
}
