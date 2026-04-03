"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/app/i18n/context";
import LucideIcon from "@/app/components/LucideIcon";

const PersonaSection = forwardRef<HTMLElement>(function PersonaSection(_, ref) {
  const { t, tArray } = useTranslation();
  const personas = tArray("persona.items") as { icon: string; role: string; desc: string }[];

  return (
    <section ref={ref} className="py-32 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl font-extrabold text-text-primary text-center mb-24"
        >
          {t("persona.title")}
        </motion.h2>

        <div className="flex flex-col gap-14">
          {personas.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-8"
            >
              <div className="w-14 h-14 rounded-2xl bg-coral/10 flex items-center justify-center flex-shrink-0">
                <LucideIcon name={p.icon} size={28} className="text-coral" strokeWidth={1.8} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-text-primary text-xl mb-1">{p.role}</h3>
                <p className="text-text-secondary leading-relaxed">{p.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});

export default PersonaSection;
