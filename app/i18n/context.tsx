"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import ko from "./ko.json";
import en from "./en.json";

type Lang = "ko" | "en";

const translations: Record<Lang, Record<string, unknown>> = { ko, en };

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  tArray: (key: string) => unknown[];
  tObj: (key: string) => unknown;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  const t = useCallback(
    (key: string): string => {
      const value = getNestedValue(translations[lang], key);
      return typeof value === "string" ? value : key;
    },
    [lang]
  );

  const tArray = useCallback(
    (key: string): unknown[] => {
      const value = getNestedValue(translations[lang], key);
      return Array.isArray(value) ? value : [];
    },
    [lang]
  );

  const tObj = useCallback(
    (key: string): unknown => {
      return getNestedValue(translations[lang], key);
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tArray, tObj }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useTranslation must be used within LanguageProvider");
  return context;
}
