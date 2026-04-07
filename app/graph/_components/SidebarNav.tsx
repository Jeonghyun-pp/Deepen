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
    <nav className="flex flex-col items-center py-3 gap-1 shrink-0 bg-white border-r border-border" style={{ width: 52 }}>
      <Link
        href="/"
        className="flex items-center justify-center w-8 h-8 rounded-xl mb-4 font-extrabold text-sm text-white bg-coral"
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
                ? "bg-coral-light text-coral"
                : "text-text-muted hover:bg-coral-light/50 hover:text-text-secondary"
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
        className="flex items-center justify-center w-9 h-9 rounded-xl text-text-muted hover:bg-coral-light/50 hover:text-text-secondary transition-colors"
      >
        <Home size={18} strokeWidth={1.8} />
      </Link>
      <button
        title="Settings"
        className="flex items-center justify-center w-9 h-9 rounded-xl text-text-muted hover:bg-coral-light/50 hover:text-text-secondary transition-colors"
      >
        <Settings size={18} strokeWidth={1.8} />
      </button>
    </nav>
  );
}
