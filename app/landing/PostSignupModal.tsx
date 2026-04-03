"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/app/i18n/context";
import Deepy, { landingConfig } from "@/app/components/Deepy";

interface PostSignupModalProps {
  visible: boolean;
  onClose: () => void;
}

function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frame: number;
    const duration = 1500;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return <span>{count.toLocaleString()}</span>;
}

export default function PostSignupModal({ visible, onClose }: PostSignupModalProps) {
  const { t } = useTranslation();
  const [explorerNumber] = useState(() => 1200 + Math.floor(Math.random() * 300));

  const counterText = t("postSignup.counter").replace("{n}", "");

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied!");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white rounded-3xl p-10 max-w-md w-full mx-4 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <Deepy emotion="celebrate" config={{ ...landingConfig, scale: 0.6 }} softShadow />
            </div>

            <h3 className="text-3xl font-extrabold text-text-primary mb-2">
              <AnimatedCounter target={explorerNumber} />
              {counterText}
            </h3>

            <p className="text-text-secondary mb-8">{t("postSignup.share")}</p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={copyLink}
                className="px-5 py-2.5 rounded-xl bg-coral-light text-coral font-semibold text-sm hover:bg-coral hover:text-white transition-colors cursor-pointer"
              >
                {t("postSignup.copyLink")}
              </button>
              <button
                className="px-5 py-2.5 rounded-xl bg-coral-light text-coral font-semibold text-sm hover:bg-coral hover:text-white transition-colors cursor-pointer"
              >
                {t("postSignup.shareTwitter")}
              </button>
            </div>

            <button
              onClick={onClose}
              className="mt-6 text-sm text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
