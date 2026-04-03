"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/app/i18n/context";
import AutoTyping from "./AutoTyping";
import Deepy, { landingConfig } from "@/app/components/Deepy";
import { Search } from "lucide-react";

const HeroSection = forwardRef<HTMLElement>(function HeroSection(_, ref) {
  const { t, tArray } = useTranslation();
  const keywords = tArray("hero.keywords") as string[];

  return (
    <section
      ref={ref}
      id="hero"
      className="min-h-screen flex items-center bg-white"
    >
      <div className="max-w-5xl mx-auto px-6 w-full flex items-center gap-12">
        {/* Text */}
        <div className="flex-1 flex flex-col gap-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl font-extrabold text-text-primary leading-tight"
          >
            {t("hero.title")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-text-secondary"
          >
            {t("hero.subtitle")}
          </motion.p>

          {/* Auto typing search bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center gap-3 bg-white border-2 border-coral-light rounded-2xl px-5 py-4 shadow-sm max-w-md"
          >
            <Search size={22} className="text-coral" strokeWidth={1.8} />
            <span className="text-lg">
              <AutoTyping words={keywords} />
            </span>
          </motion.div>

          <motion.a
            href="#cta"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="inline-block w-fit px-8 py-3.5 rounded-xl bg-coral text-white font-bold text-lg transition-all hover:bg-coral-dark"
            style={{ boxShadow: "0 4px 0 #E85555" }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translateY(4px)";
              e.currentTarget.style.boxShadow = "0 0 0 transparent";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 0 #E85555";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 0 #E85555";
            }}
          >
            {t("hero.cta")}
          </motion.a>
        </div>

        {/* Decorative Deepy */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex-shrink-0 hidden md:block"
        >
          <Deepy emotion="sparkle" config={{ ...landingConfig, scale: 1.2 }} softShadow />
        </motion.div>
      </div>
    </section>
  );
});

export default HeroSection;
