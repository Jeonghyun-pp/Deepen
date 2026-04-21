"use client";

import Link from "next/link";
import { BookOpen, PenLine, MessageCircle, Upload, Settings, Home } from "lucide-react";

const SIDEBAR_ITEMS = [
  { icon: BookOpen, label: "Graph", id: "graph" },
  { icon: PenLine, label: "Editor", id: "editor" },
  { icon: MessageCircle, label: "Chat", id: "chat" },
  { icon: Upload, label: "Upload", id: "upload" },
] as const;

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function SidebarNav({ activeTab, onTabChange }: Props) {
  return (
    <nav className="flex flex-col items-center py-3 gap-1 shrink-0 bg-[color:var(--v2-ink-soft)]/85 backdrop-blur-md border-r border-white/10" style={{ width: 52 }}>
      <Link
        href="/"
        className="flex items-center justify-center w-8 h-8 rounded-xl mb-4 font-extrabold text-sm text-black bg-[color:var(--v2-green)]"
      >
        D
      </Link>

      {SIDEBAR_ITEMS.map(({ icon: Icon, label, id }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            title={label}
            onClick={() => onTabChange(id)}
            className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
              isActive
                ? "bg-[color:var(--v2-green)]/15 text-[color:var(--v2-green-soft)]"
                : "text-white/50 hover:bg-white/5 hover:text-white/80"
            }`}
          >
            <Icon size={18} strokeWidth={1.8} />
          </button>
        );
      })}

      <div className="flex-1" />

      <Link
        href="/"
        title="Home"
        className="flex items-center justify-center w-9 h-9 rounded-xl text-white/50 hover:bg-white/5 hover:text-white/80 transition-colors"
      >
        <Home size={18} strokeWidth={1.8} />
      </Link>
      <button
        title="Settings"
        className="flex items-center justify-center w-9 h-9 rounded-xl text-white/50 hover:bg-white/5 hover:text-white/80 transition-colors"
      >
        <Settings size={18} strokeWidth={1.8} />
      </button>
    </nav>
  );
}
