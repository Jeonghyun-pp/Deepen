"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/app/i18n/context";

const StatsSection = forwardRef<HTMLElement>(function StatsSection(_, ref) {
  const { t, tArray } = useTranslation();
  const stats = tArray("stats.items") as { value: string; label: string }[];

  return (
    <section ref={ref} className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-6 ">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl font-extrabold text-text-primary text-center mb-16"
        >
          {t("stats.title")}
        </motion.h2>

        <div className="grid grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, type: "spring" }}
              className="text-center"
            >
              <div className="text-4xl font-extrabold text-coral mb-2">{stat.value}</div>
              <div className="text-sm text-text-secondary font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});

export default StatsSection;
