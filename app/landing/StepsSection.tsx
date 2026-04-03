"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/app/i18n/context";
import LucideIcon from "@/app/components/LucideIcon";

const StepsSection = forwardRef<HTMLElement>(function StepsSection(_, ref) {
  const { t, tArray } = useTranslation();
  const steps = tArray("steps.items") as { step: string; icon: string; title: string; desc: string }[];

  return (
    <section ref={ref} id="steps" className="py-32 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl font-extrabold text-text-primary text-center mb-24"
        >
          {t("steps.title")}
        </motion.h2>

        <div className="flex flex-col gap-16">
          {steps.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-8"
            >
              {/* Step number */}
              <div
                className="w-14 h-14 rounded-full bg-coral text-white flex items-center justify-center text-xl font-extrabold flex-shrink-0"
                style={{ boxShadow: "0 4px 0 var(--coral-dark)" }}
              >
                {item.step}
              </div>

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-coral/8 flex items-center justify-center flex-shrink-0">
                <LucideIcon name={item.icon} size={24} className="text-coral" strokeWidth={1.8} />
              </div>

              {/* Text */}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-text-primary mb-1">
                  {item.title}
                </h3>
                <p className="text-text-secondary leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});

export default StepsSection;
