"use client";

import {
  Search,
  Puzzle,
  DoorOpen,
  TextCursorInput,
  Sparkles,
  Layers,
  BookOpen,
  Lightbulb,
  Settings,
  GitBranch,
  Building2,
  HelpCircle,
  GraduationCap,
  Microscope,
  Code,
  Brain,
  FileText,
  type LucideProps,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  search: Search,
  puzzle: Puzzle,
  "door-open": DoorOpen,
  "text-cursor-input": TextCursorInput,
  sparkles: Sparkles,
  layers: Layers,
  "book-open": BookOpen,
  lightbulb: Lightbulb,
  settings: Settings,
  "git-branch": GitBranch,
  "building-2": Building2,
  "help-circle": HelpCircle,
  "graduation-cap": GraduationCap,
  microscope: Microscope,
  code: Code,
  brain: Brain,
  "file-text": FileText,
};

interface LucideIconProps extends LucideProps {
  name: string;
}

export default function LucideIcon({ name, ...props }: LucideIconProps) {
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon {...props} />;
}
