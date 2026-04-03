"use client";

import { motion, AnimatePresence } from "framer-motion";

interface SpeechBubbleProps {
  text: string;
  visible: boolean;
}

export default function SpeechBubble({ text, visible }: SpeechBubbleProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ duration: 0.25 }}
          className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-text-primary text-sm font-semibold px-4 py-2 rounded-2xl shadow-lg border border-border"
        >
          {text}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
