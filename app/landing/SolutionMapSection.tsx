"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/app/i18n/context";
import LayerMap from "./LayerMap";

const SolutionMapSection = forwardRef<HTMLElement>(function SolutionMapSection(_, ref) {
  const { t, tArray } = useTranslation();
  const layers = tArray("solution.layers") as { label: string; desc: string; icon: string }[];

  return (
    <section
      ref={ref}
      id="solution"
      className="py-32 section-tinted"
    >
      <div className="max-w-5xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-extrabold text-text-primary text-center mb-4"
        >
          {t("solution.title")}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg text-text-secondary text-center mb-12"
        >
          {t("solution.subtitle")}
        </motion.p>

        <LayerMap layers={layers} />
      </div>
    </section>
  );
});

export default SolutionMapSection;
