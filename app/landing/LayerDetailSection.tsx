"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/app/i18n/context";
import LucideIcon from "@/app/components/LucideIcon";

const LayerDetailSection = forwardRef<HTMLElement>(function LayerDetailSection(_, ref) {
  const { tArray } = useTranslation();
  const layers = tArray("solution.layers") as { label: string; icon: string; desc: string }[];

  const layerColors = ["#FF6B6B", "#4A90FF", "#00C9A7", "#FFB347", "#CE82FF", "#FF8A80"];

  return (
    <section ref={ref} className="py-32 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex flex-col gap-10">
          {layers.map((layer, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-5"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: layerColors[i] + "18" }}
              >
                <LucideIcon name={layer.icon} size={26} style={{ color: layerColors[i] }} strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-0.5" style={{ color: layerColors[i] }}>
                  {layer.label}
                </h3>
                <p className="text-text-secondary leading-relaxed">{layer.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});

export default LayerDetailSection;
