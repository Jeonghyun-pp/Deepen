"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/app/i18n/context";
import BetaSignupForm from "./BetaSignupForm";
import Deepy, { landingConfig } from "@/app/components/Deepy";

interface BetaCtaSectionProps {
  onSignup: (data: { email: string; interests: string[] }) => void;
  hasSignedUp: boolean;
}

const BetaCtaSection = forwardRef<HTMLElement, BetaCtaSectionProps>(
  function BetaCtaSection({ onSignup, hasSignedUp }, ref) {
    const { t } = useTranslation();

    return (
      <section
        ref={ref}
        id="cta"
        className="min-h-screen flex items-center section-tinted"
      >
        <div className="max-w-3xl mx-auto px-6 w-full py-24 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <Deepy emotion="love" config={{ ...landingConfig, scale: 0.8 }} softShadow />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-extrabold text-text-primary text-center mb-4"
          >
            {t("cta.title")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-text-secondary text-center mb-12"
          >
            {t("cta.subtitle")}
          </motion.p>

          {!hasSignedUp && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="w-full"
            >
              <BetaSignupForm onSubmit={onSignup} />
            </motion.div>
          )}
        </div>
      </section>
    );
  }
);

export default BetaCtaSection;
