"use client";

import { useTranslation } from "@/app/i18n/context";
import { useTheme, ThemeId } from "@/app/theme/context";

const themeOptions: { id: ThemeId; color: string }[] = [
  { id: "coral", color: "#FF6B6B" },
  { id: "ocean", color: "#4A90FF" },
];

export default function Header() {
  const { t, lang, setLang } = useTranslation();
  const { themeId, setThemeId } = useTheme();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="text-xl font-extrabold text-coral">{t("header.logo")}</span>

        <div className="flex items-center gap-3">
          {/* Theme switcher */}
          <div className="flex gap-1">
            {themeOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setThemeId(opt.id)}
                className={`w-7 h-7 rounded-full transition-all cursor-pointer ${
                  themeId === opt.id
                    ? "ring-2 ring-offset-2 scale-110"
                    : "opacity-40 hover:opacity-70"
                }`}
                style={{
                  background: opt.color,
                  outlineColor: themeId === opt.id ? opt.color : undefined,
                  outline: themeId === opt.id ? `2px solid ${opt.color}` : undefined,
                  outlineOffset: "3px",
                }}
                title={opt.id}
              >
              </button>
            ))}
          </div>

          {/* Language toggle */}
          <div className="flex rounded-full bg-coral-light text-sm font-semibold overflow-hidden">
            <button
              onClick={() => setLang("ko")}
              className={`px-3 py-1.5 transition-colors cursor-pointer ${
                lang === "ko" ? "bg-coral text-white" : "text-text-secondary"
              }`}
            >
              KO
            </button>
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-1.5 transition-colors cursor-pointer ${
                lang === "en" ? "bg-coral text-white" : "text-text-secondary"
              }`}
            >
              EN
            </button>
          </div>

          {/* CTA */}
          <a
            href="#cta"
            className="px-5 py-2 rounded-xl bg-coral text-white text-sm font-bold transition-all hover:bg-coral-dark"
            style={{
              boxShadow: "0 4px 0 var(--coral-dark)",
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translateY(4px)";
              e.currentTarget.style.boxShadow = "0 0 0 transparent";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 0 var(--coral-dark)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 0 var(--coral-dark)";
            }}
          >
            {t("header.cta")}
          </a>
        </div>
      </div>
    </header>
  );
}
