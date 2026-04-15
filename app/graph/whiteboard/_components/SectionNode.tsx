"use client";

import { memo, useState } from "react";
import { type NodeProps } from "@xyflow/react";
import { Trash2, Check, X as XIcon, GripVertical } from "lucide-react";
import { useWhiteboardStore } from "../../_store/whiteboardStore";
import type { Section } from "../../_data/types";

// 섹션 = Roadmap 내부의 주제 그룹 박스.
// 배경 카드 뒤에 깔리고 드래그하면 안의 카드들도 같이 움직인다(canvas가 batch 이동 처리).

export type SectionNodeData = {
  section: Section;
};

function SectionNodeComponent({ id, data, selected }: NodeProps) {
  const section = (data as SectionNodeData).section;
  const updateSection = useWhiteboardStore((s) => s.updateSection);
  const removeSection = useWhiteboardStore((s) => s.removeSection);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);

  const width = section.bounds?.w ?? 400;
  const height = section.bounds?.h ?? 300;

  const handleSave = () => {
    const t = title.trim();
    if (t && t !== section.title) {
      updateSection(id, { title: t });
    } else {
      setTitle(section.title);
    }
    setEditing(false);
  };

  return (
    <div
      className="rounded-xl"
      style={{
        width,
        height,
        background: `${section.color}14`, // 아주 옅은 배경
        border: `1.5px ${selected ? "solid" : "dashed"} ${section.color}`,
      }}
    >
      {/* 헤더: 드래그 핸들 + 제목 + 액션 */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 rounded-t-xl"
        style={{ background: `${section.color}26`, color: section.color }}
      >
        <GripVertical size={12} className="cursor-grab opacity-60" />

        {editing ? (
          <>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") {
                  setTitle(section.title);
                  setEditing(false);
                }
              }}
              autoFocus
              className="flex-1 text-xs font-semibold bg-white/80 px-1.5 py-0.5 rounded outline-none"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/40"
            >
              <Check size={12} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTitle(section.title);
                setEditing(false);
              }}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/40"
            >
              <XIcon size={12} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className="flex-1 text-left text-xs font-semibold truncate"
              title="더블클릭으로 이름 편집"
            >
              {section.title}
            </button>
            <span className="text-[10px] opacity-70">
              {section.nodeIds.length}개
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`섹션 "${section.title}"을 삭제할까요? (카드는 유지)`)) {
                  removeSection(id);
                }
              }}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/40"
              title="섹션 삭제"
            >
              <Trash2 size={11} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(SectionNodeComponent);
