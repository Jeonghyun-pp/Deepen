import type { EdgeType } from "../../_data/types";
import {
  Sparkles,
  Wrench,
  GitBranch,
  Target,
  HelpCircle,
  Quote,
  Link2,
  Layers,
  type LucideIcon,
} from "lucide-react";

export interface RelationMeta {
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export const RELATION_META: Record<EdgeType, RelationMeta> = {
  introduces: {
    label: "제안한 개념·기법",
    description: "이 논문이 처음 도입한 개념 또는 기법",
    icon: Sparkles,
    color: "#8b5cf6",
  },
  uses: {
    label: "사용하는 개념",
    description: "기존 개념·기법을 활용",
    icon: Wrench,
    color: "#64748b",
  },
  extends: {
    label: "확장한 선행 논문",
    description: "계승·발전시킨 이전 연구",
    icon: GitBranch,
    color: "#0ea5e9",
  },
  appliedIn: {
    label: "응용 분야",
    description: "실제 활용되는 영역",
    icon: Target,
    color: "#f43f5e",
  },
  raises: {
    label: "제기한 질문",
    description: "해결되지 않은 문제·논점",
    icon: HelpCircle,
    color: "#eab308",
  },
  citation: {
    label: "인용 관계",
    description: "참고/인용한 논문",
    icon: Quote,
    color: "#ef4444",
  },
  relatedTo: {
    label: "관련 개념",
    description: "의미적으로 연결된 항목",
    icon: Link2,
    color: "#94a3b8",
  },
  // legacy / structural (도 표시되는 경우 대비)
  shared_concept: {
    label: "공유 개념",
    description: "공통 개념을 공유하는 관계",
    icon: Layers,
    color: "#9ca3af",
  },
  similarity: {
    label: "유사 관계",
    description: "표현·주제가 유사한 관계",
    icon: Layers,
    color: "#9ca3af",
  },
  manual: {
    label: "수동 연결",
    description: "사용자가 직접 연결",
    icon: Layers,
    color: "#9ca3af",
  },
  contains: {
    label: "포함",
    description: "구조적 포함 관계",
    icon: Layers,
    color: "#d1d5db",
  },
};
