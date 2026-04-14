"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Plus,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Minus,
  AtSign,
  Trash2,
  GripVertical,
} from "lucide-react";
import type { GraphNode, NoteDocument, NoteBlock } from "../_data/types";
import { NODE_COLORS, TYPE_LABELS } from "../_data/colors";

// ==================== Inline Markdown ====================

// 인라인 md: **bold**, *italic*, `code`, [text](url)
// 한 번의 스캔으로 토큰화하여 JSX 생성.
function renderInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];
  const tokens: React.ReactNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      tokens.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[4]) {
      tokens.push(<em key={key++}>{match[4]}</em>);
    } else if (match[6]) {
      tokens.push(
        <code key={key++} className="px-1 py-0.5 rounded bg-gray-100 text-[0.85em] font-mono text-coral">
          {match[6]}
        </code>
      );
    } else if (match[8] && match[9]) {
      tokens.push(
        <a key={key++} href={match[9]} target="_blank" rel="noopener noreferrer"
           className="text-coral underline hover:text-coral-dark">
          {match[8]}
        </a>
      );
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) tokens.push(text.slice(lastIndex));
  return tokens;
}

// ==================== Block Renderers ====================

function ParagraphBlock({
  block,
  onChange,
  onKeyDown,
  autoFocus,
  isEditing,
  onStartEdit,
  onStopEdit,
}: {
  block: Extract<NoteBlock, { type: "paragraph" }>;
  onChange: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  autoFocus?: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
}) {
  if (!isEditing && block.text.trim() !== "") {
    return (
      <div
        onClick={onStartEdit}
        className="w-full text-sm text-text-primary leading-relaxed cursor-text whitespace-pre-wrap break-words min-h-[1.5rem]"
      >
        {renderInlineMarkdown(block.text)}
      </div>
    );
  }
  return (
    <textarea
      value={block.text}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={onStopEdit}
      autoFocus={autoFocus || isEditing}
      placeholder="내용을 입력하세요... (**굵게**, *기울임*, `코드`, [링크](url))"
      rows={1}
      className="w-full bg-transparent text-sm text-text-primary leading-relaxed outline-none resize-none placeholder:text-text-muted/50"
      style={{ minHeight: "1.5rem", height: "auto" }}
      onInput={(e) => {
        const t = e.target as HTMLTextAreaElement;
        t.style.height = "auto";
        t.style.height = t.scrollHeight + "px";
      }}
    />
  );
}

function HeadingBlock({
  block,
  onChange,
  onKeyDown,
}: {
  block: Extract<NoteBlock, { type: "heading" }>;
  onChange: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  const sizeClass =
    block.level === 1
      ? "text-xl font-extrabold"
      : block.level === 2
      ? "text-lg font-bold"
      : "text-base font-semibold";

  return (
    <input
      type="text"
      value={block.text}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={`제목 ${block.level}`}
      className={`w-full bg-transparent text-text-primary outline-none placeholder:text-text-muted/40 ${sizeClass}`}
    />
  );
}

function ListBlock({
  block,
  onChange,
  onKeyDown,
}: {
  block: Extract<NoteBlock, { type: "list" }>;
  onChange: (items: string[]) => void;
  onKeyDown: (e: React.KeyboardEvent, index: number) => void;
}) {
  const handleItemChange = (index: number, value: string) => {
    const next = [...block.items];
    next[index] = value;
    onChange(next);
  };

  const addItem = () => onChange([...block.items, ""]);

  return (
    <div className="flex flex-col gap-1">
      {block.items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="text-xs text-text-muted mt-0.5 w-4 shrink-0 text-right">
            {block.ordered ? `${i + 1}.` : "\u2022"}
          </span>
          <input
            type="text"
            value={item}
            onChange={(e) => handleItemChange(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const next = [...block.items];
                next.splice(i + 1, 0, "");
                onChange(next);
              } else if (e.key === "Backspace" && item === "" && block.items.length > 1) {
                e.preventDefault();
                onChange(block.items.filter((_, idx) => idx !== i));
              } else {
                onKeyDown(e, i);
              }
            }}
            placeholder="항목..."
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted/40"
          />
        </div>
      ))}
      <button
        onClick={addItem}
        className="text-[10px] text-text-muted hover:text-coral ml-6"
      >
        + 항목 추가
      </button>
    </div>
  );
}

function CodeBlock({
  block,
  onChange,
}: {
  block: Extract<NoteBlock, { type: "code" }>;
  onChange: (code: string) => void;
}) {
  return (
    <div className="rounded-lg bg-gray-900 p-3">
      {block.language && (
        <span className="text-[10px] text-gray-400 mb-1 block">{block.language}</span>
      )}
      <textarea
        value={block.code}
        onChange={(e) => onChange(e.target.value)}
        placeholder="코드를 입력하세요..."
        className="w-full bg-transparent text-sm text-gray-100 font-mono outline-none resize-none placeholder:text-gray-600"
        rows={3}
        onInput={(e) => {
          const t = e.target as HTMLTextAreaElement;
          t.style.height = "auto";
          t.style.height = t.scrollHeight + "px";
        }}
      />
    </div>
  );
}

function NodeRefBlock({
  block,
  onNodeClick,
}: {
  block: Extract<NoteBlock, { type: "node-ref" }>;
  onNodeClick: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onNodeClick(block.nodeId)}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-coral-light/40 border border-coral/20 text-sm font-semibold text-coral hover:bg-coral-light transition-colors"
    >
      <AtSign size={12} />
      {block.label}
    </button>
  );
}

function DividerBlock() {
  return <hr className="border-border my-1" />;
}

// ==================== @Mention Dropdown ====================

function MentionDropdown({
  query,
  nodes,
  onSelect,
  onClose,
}: {
  query: string;
  nodes: GraphNode[];
  onSelect: (node: GraphNode) => void;
  onClose: () => void;
}) {
  const q = query.toLowerCase();
  const filtered = nodes.filter(
    (n) => n.label.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  ).slice(0, 8);

  if (filtered.length === 0) return null;

  return (
    <div className="absolute z-50 mt-1 w-72 bg-white rounded-xl border border-border shadow-lg overflow-hidden">
      <div className="px-3 py-1.5 border-b border-border">
        <span className="text-[10px] text-text-muted">노드 인용 — &quot;{query}&quot;</span>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filtered.map((n) => (
          <button
            key={n.id}
            onClick={() => { onSelect(n); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-coral-light/30 transition-colors"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: NODE_COLORS[n.type] }}
            />
            <span className="text-xs font-semibold text-text-primary truncate flex-1">
              {n.label}
            </span>
            <span className="text-[10px] text-text-muted">{TYPE_LABELS[n.type]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ==================== Block Type Selector ====================

const BLOCK_TYPES = [
  { type: "paragraph", label: "텍스트", icon: Type },
  { type: "heading-1", label: "제목 1", icon: Heading1 },
  { type: "heading-2", label: "제목 2", icon: Heading2 },
  { type: "heading-3", label: "제목 3", icon: Heading3 },
  { type: "list-ul", label: "목록", icon: List },
  { type: "list-ol", label: "번호 목록", icon: ListOrdered },
  { type: "code", label: "코드", icon: Code },
  { type: "divider", label: "구분선", icon: Minus },
] as const;

function createBlock(typeKey: string): NoteBlock {
  switch (typeKey) {
    case "paragraph": return { type: "paragraph", text: "" };
    case "heading-1": return { type: "heading", level: 1, text: "" };
    case "heading-2": return { type: "heading", level: 2, text: "" };
    case "heading-3": return { type: "heading", level: 3, text: "" };
    case "list-ul": return { type: "list", ordered: false, items: [""] };
    case "list-ol": return { type: "list", ordered: true, items: [""] };
    case "code": return { type: "code", code: "" };
    case "divider": return { type: "divider" };
    default: return { type: "paragraph", text: "" };
  }
}

// ==================== Main Component ====================

interface Props {
  note: NoteDocument;
  allNodes: GraphNode[];
  onUpdate: (updates: Partial<Pick<NoteDocument, "title" | "blocks" | "references">>) => void;
  onNodeClick: (id: string) => void;
}

export default function NoteCanvasView({ note, allNodes, onUpdate, onNodeClick }: Props) {
  // Local state for instant responsiveness
  const [localTitle, setLocalTitle] = useState(note.title);
  const [localBlocks, setLocalBlocks] = useState<NoteBlock[]>(note.blocks);
  const [localRefs, setLocalRefs] = useState<string[]>(note.references);
  const [showBlockMenu, setShowBlockMenu] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [mentionState, setMentionState] = useState<{ blockIndex: number; query: string } | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from parent when note id changes (switching notes)
  useEffect(() => {
    setLocalTitle(note.title);
    setLocalBlocks(note.blocks);
    setLocalRefs(note.references);
  }, [note.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced sync to parent
  const syncToParent = useCallback(
    (updates: Partial<Pick<NoteDocument, "title" | "blocks" | "references">>) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => onUpdate(updates), 400);
    },
    [onUpdate]
  );

  useEffect(() => {
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, []);

  const updateTitle = (title: string) => {
    setLocalTitle(title);
    syncToParent({ title });
  };

  const updateBlock = (index: number, updated: NoteBlock) => {
    const blocks = [...localBlocks];
    blocks[index] = updated;
    setLocalBlocks(blocks);
    syncToParent({ blocks });
  };

  const insertBlockAfter = (index: number, typeKey: string) => {
    const blocks = [...localBlocks];
    blocks.splice(index + 1, 0, createBlock(typeKey));
    setLocalBlocks(blocks);
    onUpdate({ blocks });
    setShowBlockMenu(null);
  };

  const removeBlock = (index: number) => {
    if (localBlocks.length <= 1) return;
    const blocks = localBlocks.filter((_, i) => i !== index);
    setLocalBlocks(blocks);
    onUpdate({ blocks });
  };

  const handleMentionSelect = (blockIndex: number, node: GraphNode) => {
    const blocks = [...localBlocks];
    const refBlock: NoteBlock = { type: "node-ref", nodeId: node.id, label: node.label };
    blocks.splice(blockIndex + 1, 0, refBlock);

    const current = blocks[blockIndex];
    if (current.type === "paragraph" && mentionState) {
      const atIdx = current.text.lastIndexOf("@");
      if (atIdx >= 0) {
        blocks[blockIndex] = { ...current, text: current.text.slice(0, atIdx) };
      }
    }

    const refs = [...new Set([...localRefs, node.id])];
    setLocalBlocks(blocks);
    setLocalRefs(refs);
    onUpdate({ blocks, references: refs });
    setMentionState(null);
  };

  const handleBlockKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      const block = localBlocks[index];
      if (block.type === "paragraph" || block.type === "heading") {
        e.preventDefault();
        insertBlockAfter(index, "paragraph");
      }
    }
    if (e.key === "Backspace") {
      const block = localBlocks[index];
      if (
        (block.type === "paragraph" && block.text === "") ||
        (block.type === "heading" && block.text === "")
      ) {
        if (localBlocks.length > 1) {
          e.preventDefault();
          removeBlock(index);
        }
      }
    }
  };

  const handleParagraphChange = (index: number, text: string) => {
    updateBlock(index, { type: "paragraph", text });
    const atIdx = text.lastIndexOf("@");
    if (atIdx >= 0) {
      const afterAt = text.slice(atIdx + 1);
      if (!afterAt.includes(" ") && afterAt.length <= 30) {
        setMentionState({ blockIndex: index, query: afterAt });
        return;
      }
    }
    setMentionState(null);
  };

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="max-w-2xl mx-auto px-8 py-8">
        {/* Title */}
        <input
          type="text"
          value={localTitle}
          onChange={(e) => updateTitle(e.target.value)}
          placeholder="제목 없음"
          className="w-full text-2xl font-extrabold text-text-primary outline-none placeholder:text-text-muted/40 mb-1"
        />
        <p className="text-[10px] text-text-muted mb-6">
          {localRefs.length > 0 && `${localRefs.length}개 노드 인용 · `}
          {new Date(note.updatedAt).toLocaleDateString("ko-KR")} 수정
        </p>

        {/* Blocks */}
        <div className="flex flex-col gap-2">
          {localBlocks.map((block, i) => (
            <div key={i} className="group relative flex gap-2">
              {/* Drag handle + delete */}
              <div className="flex flex-col items-center gap-0.5 pt-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 w-6">
                <button className="text-text-muted/40 hover:text-text-muted cursor-grab">
                  <GripVertical size={12} />
                </button>
                <button
                  onClick={() => removeBlock(i)}
                  className="text-text-muted/40 hover:text-red-400"
                >
                  <Trash2 size={10} />
                </button>
              </div>

              {/* Block content */}
              <div className="flex-1 min-w-0 relative">
                {block.type === "paragraph" && (
                  <ParagraphBlock
                    block={block}
                    onChange={(text) => handleParagraphChange(i, text)}
                    onKeyDown={(e) => handleBlockKeyDown(e, i)}
                    autoFocus={i === localBlocks.length - 1 && block.text === ""}
                    isEditing={editingIndex === i || block.text === ""}
                    onStartEdit={() => setEditingIndex(i)}
                    onStopEdit={() => setEditingIndex((cur) => (cur === i ? null : cur))}
                  />
                )}
                {block.type === "heading" && (
                  <HeadingBlock
                    block={block}
                    onChange={(text) => updateBlock(i, { ...block, text })}
                    onKeyDown={(e) => handleBlockKeyDown(e, i)}
                  />
                )}
                {block.type === "list" && (
                  <ListBlock
                    block={block}
                    onChange={(items) => updateBlock(i, { ...block, items })}
                    onKeyDown={(e) => handleBlockKeyDown(e, i)}
                  />
                )}
                {block.type === "code" && (
                  <CodeBlock
                    block={block}
                    onChange={(code) => updateBlock(i, { ...block, code })}
                  />
                )}
                {block.type === "node-ref" && (
                  <NodeRefBlock block={block} onNodeClick={onNodeClick} />
                )}
                {block.type === "divider" && <DividerBlock />}

                {/* @Mention dropdown */}
                {mentionState && mentionState.blockIndex === i && (
                  <MentionDropdown
                    query={mentionState.query}
                    nodes={allNodes}
                    onSelect={(node) => handleMentionSelect(i, node)}
                    onClose={() => setMentionState(null)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add block button */}
        <div className="relative mt-4">
          <button
            onClick={() => setShowBlockMenu(localBlocks.length - 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-coral hover:bg-coral-light/30 transition-colors"
          >
            <Plus size={14} />
            블록 추가
          </button>

          {showBlockMenu === localBlocks.length - 1 && (
            <div className="absolute z-50 bottom-full mb-1 left-0 w-52 bg-white rounded-xl border border-border shadow-lg overflow-hidden">
              {BLOCK_TYPES.map((bt) => {
                const Icon = bt.icon;
                return (
                  <button
                    key={bt.type}
                    onClick={() => insertBlockAfter(localBlocks.length - 1, bt.type)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-text-secondary hover:bg-coral-light/30 hover:text-coral transition-colors"
                  >
                    <Icon size={13} />
                    {bt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Referenced nodes summary */}
        {localRefs.length > 0 && (
          <div className="mt-8 pt-4 border-t border-border">
            <p className="text-[10px] font-bold text-text-muted mb-2 uppercase tracking-wider">
              인용된 노드
            </p>
            <div className="flex flex-wrap gap-1.5">
              {localRefs.map((refId) => {
                const refNode = allNodes.find((n) => n.id === refId);
                if (!refNode) return null;
                return (
                  <button
                    key={refId}
                    onClick={() => onNodeClick(refId)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border text-[11px] text-text-secondary hover:border-coral/40 hover:text-coral transition-colors"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: NODE_COLORS[refNode.type] }}
                    />
                    {refNode.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
