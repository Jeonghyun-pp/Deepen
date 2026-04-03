"use client";

import { forwardRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/app/i18n/context";

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-5 flex items-center justify-between text-left cursor-pointer"
      >
        <span className="font-semibold text-text-primary">{q}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-text-muted text-xl"
        >
          ▾
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 text-sm text-text-secondary leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const FaqSection = forwardRef<HTMLElement>(function FaqSection(_, ref) {
  const { t, tArray } = useTranslation();
  const items = tArray("faq.items") as { q: string; a: string }[];

  return (
    <section ref={ref} className="py-24 bg-white">
      <div className="max-w-2xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl font-extrabold text-text-primary text-center mb-12"
        >
          {t("faq.title")}
        </motion.h2>

        <div className="flex flex-col gap-3">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <FaqItem q={item.q} a={item.a} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});

export default FaqSection;
