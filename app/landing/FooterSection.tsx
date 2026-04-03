"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/app/i18n/context";
import Deepy, { landingConfig } from "@/app/components/Deepy";

const FooterSection = forwardRef<HTMLElement>(function FooterSection(_, ref) {
  const { t } = useTranslation();

  return (
    <footer ref={ref} id="footer" className="bg-section-footer text-white py-16 relative">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <span className="text-2xl font-extrabold text-coral">{t("header.logo")}</span>
        <p className="text-sm text-white/50 mt-4">{t("footer.copyright")}</p>

        {/* Sleepy Deepy easter egg */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.5 }}
          viewport={{ once: false, amount: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-8 flex justify-center"
        >
          <Deepy
            emotion="sleepy"
            config={{
              ...landingConfig,
              bodyColor: "#2A2A5A",
              lensInner: "#1A1A40",
              handleColor: "#3A3A6A",
              eyeColor: "#AAAACC",
              lensGlow: "#FF6B6B",
              scale: 0.35,
            }}
            softShadow
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: false, amount: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-4 text-sm text-white/30"
        >
          {t("footer.hidden")}
        </motion.p>
      </div>
    </footer>
  );
});

export default FooterSection;
