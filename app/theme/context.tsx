"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeId = "coral" | "ocean";

interface ThemeColors {
  brand: string;
  brandDark: string;
  brandLight: string;
  tint: string;
  footer: string;
}

const themes: Record<ThemeId, ThemeColors> = {
  coral: {
    brand: "#FF6B6B",
    brandDark: "#E85555",
    brandLight: "#FFE0E0",
    tint: "#FFF5F2",
    footer: "#1A1A2E",
  },
  ocean: {
    brand: "#4A90FF",
    brandDark: "#3570CC",
    brandLight: "#E0EDFF",
    tint: "#EEF3FF",
    footer: "#0F1729",
  },
};

interface ThemeContextValue {
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>("ocean");
  const colors = themes[themeId];

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--coral", colors.brand);
    root.style.setProperty("--coral-dark", colors.brandDark);
    root.style.setProperty("--coral-light", colors.brandLight);
    root.style.setProperty("--section-tint", colors.tint);
    root.style.setProperty("--section-footer", colors.footer);
  }, [colors]);

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
