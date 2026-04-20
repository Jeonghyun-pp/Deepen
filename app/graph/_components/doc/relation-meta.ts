import type { EdgeType } from "../../_data/types";
import { ArrowRight, Layers, Link2, type LucideIcon } from "lucide-react";

export interface RelationMeta {
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export const RELATION_META: Record<EdgeType, RelationMeta> = {
  prerequisite: {
    label: "선수 개념",
    description: "이것을 먼저 이해해야 본 개념을 이해할 수 있음",
    icon: ArrowRight,
    color: "#8b5cf6",
  },
  contains: {
    label: "포함",
    description: "상위 개념이 하위 개념을 포함함",
    icon: Layers,
    color: "#d1d5db",
  },
  relatedTo: {
    label: "관련 개념",
    description: "같은 맥락에서 언급됨",
    icon: Link2,
    color: "#94a3b8",
  },
};
