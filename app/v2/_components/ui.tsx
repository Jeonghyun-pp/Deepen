"use client";

import Link from "next/link";
import { ChevronRight, Sparkles, Trophy, Search } from "lucide-react";
import type { ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

/* ────────────────────────────────────────────────────────────────
   Semantic color tokens (single source of truth)
   ──────────────────────────────────────────────────────────────── */
export const C = {
  // base
  bg: "#FAFAF8",
  bgRadial: "radial-gradient(ellipse at 42% 50%, #ECF7EE 0%, #F5F7F2 45%, #FAFAF8 100%)",
  ink: "#1A1A2E",
  // semantic
  mastery: "#15803D",
  masterySoft: "#22C55E",
  weakness: "#E11D48",
  weaknessSoft: "#FB7185",
  frequency: "#CA8A04",
  prereq: "#7C3AED",
  prereqSoft: "#A78BFA",
  // surfaces
  border: "rgba(0,0,0,0.08)",
  borderHover: "rgba(0,0,0,0.18)",
} as const;

/* ────────────────────────────────────────────────────────────────
   Card — white panel with soft border + lifted shadow
   ──────────────────────────────────────────────────────────────── */
export function Card({
  children,
  className = "",
  hoverable = false,
}: {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${
        hoverable ? "hover:border-black/15 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Chip — small white pill for header/filter
   ──────────────────────────────────────────────────────────────── */
export function Chip({
  children,
  icon,
  onClick,
  active = false,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
        active
          ? "border-[#15803D]/25 bg-[#ECFDF5] text-[#15803D] font-medium"
          : "border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-black/70 hover:border-black/15"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────
   ContextChip — 📎 grounding chip used by AI coach
   ──────────────────────────────────────────────────────────────── */
export function ContextChip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "user" | "history";
}) {
  const cls =
    tone === "user"
      ? "border-[#15803D]/25 bg-[#ECFDF5] text-[#15803D]"
      : tone === "history"
        ? "border-black/8 bg-black/[0.03] text-black/55"
        : "border-black/10 bg-white text-black/75";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${cls}`}>
      <span className="opacity-60">📎</span>
      {children}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────
   MasteryBar — gradient progress, weakness/normal variants
   ──────────────────────────────────────────────────────────────── */
export function MasteryBar({
  value,
  weak = false,
  size = "md",
}: {
  value: number; // 0..1
  weak?: boolean;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-1" : "h-1.5";
  return (
    <div className={`${h} rounded-full bg-black/[0.06] overflow-hidden`}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(100, Math.max(0, value * 100))}%`,
          background: weak
            ? "linear-gradient(to right, #E11D48, #FB7185)"
            : "linear-gradient(to right, #15803D, #22C55E)",
        }}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Buttons
   ──────────────────────────────────────────────────────────────── */
type BtnSize = "sm" | "md" | "lg";

const sizes: Record<BtnSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-md",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-5 py-2.5 text-sm rounded-lg",
};

export function PrimaryButton({
  children,
  size = "md",
  className = "",
  href,
  ...rest
}: {
  children: ReactNode;
  size?: BtnSize;
  href?: string;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = `inline-flex items-center justify-center gap-1.5 font-semibold bg-[#15803D] hover:bg-[#166534] text-white shadow-[0_2px_8px_rgba(21,128,61,0.25)] transition ${sizes[size]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button {...rest} className={cls}>
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  size = "md",
  className = "",
  href,
  ...rest
}: {
  children: ReactNode;
  size?: BtnSize;
  href?: string;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = `inline-flex items-center justify-center gap-1.5 font-semibold border border-black/12 bg-white text-black/75 hover:bg-black/[0.03] transition ${sizes[size]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button {...rest} className={cls}>
      {children}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────
   ActionButton — icon + label, white card style (coach actions)
   ──────────────────────────────────────────────────────────────── */
export function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-black/10 bg-white hover:border-black/20 hover:shadow-[0_2px_6px_rgba(0,0,0,0.04)] transition text-xs"
    >
      <span className="text-[#15803D]">{icon}</span>
      <span className="font-medium text-black/80">{label}</span>
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────
   TabBar — underline indicator
   ──────────────────────────────────────────────────────────────── */
export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex items-center border-b border-black/5">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 px-3 py-3 text-xs font-medium transition relative ${
            active === t.id ? "text-[#1A1A2E]" : "text-black/40 hover:text-black/70"
          }`}
        >
          {t.label}
          {active === t.id && (
            <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#15803D]" />
          )}
        </button>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   TopNav — logo + breadcrumb + right slot
   ──────────────────────────────────────────────────────────────── */
export function TopNav({
  breadcrumb,
  rightSlot,
  variant = "transparent",
}: {
  breadcrumb?: { label: string; href?: string }[];
  rightSlot?: ReactNode;
  variant?: "transparent" | "solid";
}) {
  return (
    <header
      className={`flex items-center justify-between px-6 py-4 ${
        variant === "solid" ? "border-b border-black/5 bg-white" : ""
      }`}
    >
      <div className="flex items-center gap-4">
        <Link href="/v2" className="font-extrabold tracking-[0.18em] text-xs">
          DEEPEN<span className="opacity-40">.LAB</span>
        </Link>
        {breadcrumb && breadcrumb.length > 0 && (
          <>
            <span className="text-black/20">/</span>
            <nav className="flex items-center gap-2 text-xs">
              {breadcrumb.map((b, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight size={12} className="text-black/30" />}
                  {b.href ? (
                    <Link href={b.href} className="text-black/45 hover:text-black/70 transition">
                      {b.label}
                    </Link>
                  ) : (
                    <span className={i === breadcrumb.length - 1 ? "font-semibold" : "text-black/45"}>
                      {b.label}
                    </span>
                  )}
                </span>
              ))}
            </nav>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">{rightSlot ?? <DefaultNavRight />}</div>
    </header>
  );
}

export function DefaultNavRight() {
  return (
    <>
      <div className="hidden md:flex items-center gap-2 rounded-full border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] px-3 py-1.5 text-xs">
        <Search size={12} className="opacity-40" />
        <span className="opacity-50">유형·개념 검색</span>
        <kbd className="ml-2 px-1.5 py-0.5 rounded bg-black/5 text-[10px] opacity-60">⌘K</kbd>
      </div>
      <div className="flex items-center gap-1.5 rounded-full border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] px-3 py-1.5 text-xs">
        <Trophy size={12} className="text-[#15803D]" />
        <span className="font-semibold">12</span>
        <span className="opacity-50">일째</span>
      </div>
      <button className="flex items-center gap-1.5 rounded-full border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] px-3 py-1.5 text-xs hover:bg-black/[0.03] transition">
        <Sparkles size={12} className="text-[#15803D]" />
        AI 코치
      </button>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   GlobalNav — sidebar nav (left rail) used by main pages
   ──────────────────────────────────────────────────────────────── */
export function PrimaryNavLink({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
        active
          ? "bg-black/[0.05] text-[#1A1A2E]"
          : "text-black/55 hover:text-[#1A1A2E] hover:bg-black/[0.03]"
      }`}
    >
      <span className={active ? "text-[#15803D]" : "opacity-60"}>{icon}</span>
      {label}
    </Link>
  );
}

/* ────────────────────────────────────────────────────────────────
   PageShell — common shell with bg + warm radial wash
   ──────────────────────────────────────────────────────────────── */
export function PageShell({
  children,
  warmWash = false,
}: {
  children: ReactNode;
  warmWash?: boolean;
}) {
  return (
    <div className="relative min-h-screen w-full bg-[#FAFAF8] text-[#1A1A2E]">
      {warmWash && (
        <div
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{ background: C.bgRadial }}
        />
      )}
      {children}
    </div>
  );
}
