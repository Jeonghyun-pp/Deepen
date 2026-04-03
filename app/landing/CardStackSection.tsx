"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/app/i18n/context";
import KnowledgeRoadmap from "./KnowledgeRoadmap";

const CardStackSection = forwardRef<HTMLElement>(function CardStackSection(_, ref) {
  const { t, tArray } = useTranslation();
  const papers = tArray("cards.papers") as {
    title: string;
    authors: string;
    tag: string;
    abstract: string;
  }[];

  return (
    <section
      ref={ref}
      id="cards"
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
          {t("cards.title")}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg text-text-secondary text-center mb-16"
        >
          {t("cards.subtitle")}
        </motion.p>

        <KnowledgeRoadmap papers={papers} />
      </div>
    </section>
  );
});

export default CardStackSection;
