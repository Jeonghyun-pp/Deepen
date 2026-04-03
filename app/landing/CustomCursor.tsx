"use client";

import { useEffect, useState } from "react";

export default function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't apply on touch devices
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
    };

    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    document.body.style.cursor = "none";

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      document.body.style.cursor = "";
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: pos.x - 12,
        top: pos.y - 12,
        transition: "left 0.05s, top 0.05s",
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        {/* Magnifying glass */}
        <circle cx="10" cy="10" r="7" stroke="#FF6B6B" strokeWidth="2.5" fill="white" fillOpacity="0.8" />
        <line x1="15" y1="15" x2="22" y2="22" stroke="#FF6B6B" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
