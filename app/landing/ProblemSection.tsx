"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/app/i18n/context";
import LucideIcon from "@/app/components/LucideIcon";

const ProblemSection = forwardRef<HTMLElement>(function ProblemSection(_, ref) {
  const { t, tArray } = useTranslation();
  const cards = tArray("problem.cards") as { icon: string; title: string; desc: string }[];

  return (
    <section
      ref={ref}
      id="problem"
      className="section-tinted py-32"
    >
      <div className="max-w-4xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-extrabold text-text-primary text-center mb-24"
        >
          {t("problem.title")}
        </motion.h2>

        <div className="flex flex-col gap-20">
          {cards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-10"
            >
              <div className="w-14 h-14 rounded-2xl bg-coral/10 flex items-center justify-center flex-shrink-0">
                <LucideIcon name={card.icon} size={28} className="text-coral" strokeWidth={1.8} />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-text-primary mb-2">
                  {card.title}
                </h3>
                <p className="text-lg text-text-secondary leading-relaxed">
                  {card.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});

export default ProblemSection;
