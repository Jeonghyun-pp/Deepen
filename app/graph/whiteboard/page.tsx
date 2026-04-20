"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const WhiteboardShell = dynamic(() => import("./_components/WhiteboardShell"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center">
      <div className="text-text-muted text-sm">Loading whiteboard...</div>
    </div>
  ),
});

export default function WhiteboardPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full w-full flex items-center justify-center">
          <div className="text-text-muted text-sm">Loading...</div>
        </div>
      }
    >
      <WhiteboardShell />
    </Suspense>
  );
}
