"use client";

import { useEffect } from "react";
import { sampleGraphData } from "../../_data/sample-data";
import { useGraphStore } from "../../_store/graphStore";
import ViewSwitcher from "../../_components/ViewSwitcher";
import WhiteboardCanvas from "./WhiteboardCanvas";

export default function WhiteboardShell() {
  const initData = useGraphStore((s) => s.initData);

  // store가 비어 있으면 샘플 데이터로 초기화 (Graph 뷰와 동일 소스)
  useEffect(() => {
    initData(sampleGraphData);
  }, [initData]);

  return (
    <div className="h-screen w-screen relative bg-white">
      <ViewSwitcher />
      <WhiteboardCanvas />
    </div>
  );
}
