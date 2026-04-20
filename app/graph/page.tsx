"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const GraphShell = dynamic(() => import("./_components/GraphShell"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center">
      <div className="text-text-muted text-sm">Loading graph...</div>
    </div>
  ),
});

export default function GraphPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full w-full flex items-center justify-center">
          <div className="text-text-muted text-sm">Loading...</div>
        </div>
      }
    >
      <GraphShell />
    </Suspense>
  );
}
