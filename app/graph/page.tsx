"use client";

import dynamic from "next/dynamic";

const GraphShell = dynamic(() => import("./_components/GraphShell"), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-screen flex items-center justify-center bg-white">
      <div className="text-text-muted text-sm">Loading graph...</div>
    </div>
  ),
});

export default function GraphPage() {
  return <GraphShell />;
}
