"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 두 뷰(Reagraph 2D/3D, Whiteboard) 간 전환 탭.
// 공유 store 덕에 선택·필터·로드맵 상태가 그대로 유지됨.
export default function ViewSwitcher() {
  const pathname = usePathname();
  const isWhiteboard = pathname?.startsWith("/graph/whiteboard");

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 rounded-full border border-white/10 bg-[color:var(--v2-ink-soft)]/85 backdrop-blur-md px-1 py-1">
      <Link
        href="/graph"
        className={`px-3 py-1 text-xs rounded-full transition ${
          !isWhiteboard
            ? "bg-[color:var(--v2-green)] text-black"
            : "text-white/50 hover:text-white/80"
        }`}
      >
        Graph
      </Link>
      <Link
        href="/graph/whiteboard"
        className={`px-3 py-1 text-xs rounded-full transition ${
          isWhiteboard
            ? "bg-[color:var(--v2-green)] text-black"
            : "text-white/50 hover:text-white/80"
        }`}
      >
        Whiteboard
      </Link>
    </div>
  );
}
