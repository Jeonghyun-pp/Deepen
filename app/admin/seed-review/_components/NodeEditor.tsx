"use client"

/**
 * 노드 편집 + 엣지 관리.
 * type 별 분기 (Pattern / Item).
 */

import { useEffect, useState } from "react"
import type {
  EdgeDto,
  NodeDetailResponse,
  NodeSearchHitDto,
  PatchNodeRequest,
} from "@/lib/api/schemas/admin"
import { NodeSearch } from "./NodeSearch"

export interface NodeEditorProps {
  detail: NodeDetailResponse
  busy: boolean
  onPatch: (id: string, patch: Record<string, unknown>) => Promise<boolean>
  onPublish: (id: string) => Promise<void>
  onDiscard: (id: string) => Promise<void>
  onAddEdge: (args: {
    sourceNodeId: string
    targetNodeId: string
    type: "prerequisite" | "contains"
  }) => Promise<void>
  onRemoveEdge: (edgeId: string) => Promise<void>
}

export function NodeEditor({
  detail,
  busy,
  onPatch,
  onPublish,
  onDiscard,
  onAddEdge,
  onRemoveEdge,
}: NodeEditorProps) {
  const { node } = detail
  const isPattern = node.type === "pattern"

  const [form, setForm] = useState(() => ({
    label: node.label,
    grade: node.grade ?? "",
    displayLayer: node.displayLayer ?? "pattern",
    signature: node.signature ?? [],
    isKiller: node.isKiller,
    frequencyRank: node.frequencyRank ?? null,
    avgCorrectRate: node.avgCorrectRate ?? null,
    itemSource: node.itemSource ?? "",
    itemYear: node.itemYear ?? null,
    itemNumber: node.itemNumber ?? null,
    itemDifficulty: node.itemDifficulty ?? null,
    itemAnswer: node.itemAnswer ?? "",
    itemSolution: node.itemSolution ?? "",
    itemChoices: node.itemChoices ?? [],
  }))

  // 새 노드 선택 시 form 동기화
  useEffect(() => {
    setForm({
      label: node.label,
      grade: node.grade ?? "",
      displayLayer: node.displayLayer ?? "pattern",
      signature: node.signature ?? [],
      isKiller: node.isKiller,
      frequencyRank: node.frequencyRank ?? null,
      avgCorrectRate: node.avgCorrectRate ?? null,
      itemSource: node.itemSource ?? "",
      itemYear: node.itemYear ?? null,
      itemNumber: node.itemNumber ?? null,
      itemDifficulty: node.itemDifficulty ?? null,
      itemAnswer: node.itemAnswer ?? "",
      itemSolution: node.itemSolution ?? "",
      itemChoices: node.itemChoices ?? [],
    })
  }, [node.id, node])

  const save = async () => {
    const patch: PatchNodeRequest = isPattern
      ? {
          label: form.label,
          grade: form.grade || null,
          displayLayer: form.displayLayer,
          signature: form.signature,
          isKiller: form.isKiller,
          frequencyRank: form.frequencyRank,
          avgCorrectRate: form.avgCorrectRate,
        }
      : {
          label: form.label,
          itemSource: form.itemSource || null,
          itemYear: form.itemYear,
          itemNumber: form.itemNumber,
          itemDifficulty: form.itemDifficulty,
          itemAnswer: form.itemAnswer || null,
          itemSolution: form.itemSolution || null,
          itemChoices: form.itemChoices.length > 0 ? form.itemChoices : null,
        }
    await onPatch(node.id, patch)
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex items-center justify-between border-b border-black/5 pb-3">
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-medium ${
              isPattern
                ? "bg-blue-100 text-blue-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {isPattern ? "Pattern" : "Item"}
          </span>
          <span className="text-[11px] text-black/45">{node.id}</span>
        </div>
        <span
          className={`rounded px-2 py-0.5 text-[11px] ${
            node.status === "draft"
              ? "bg-zinc-100 text-zinc-700"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {node.status === "draft" ? "검수 대기" : "발행됨"}
        </span>
      </header>

      <Field label="라벨 (제목)">
        <textarea
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          rows={isPattern ? 2 : 6}
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm leading-6"
        />
      </Field>

      {isPattern ? (
        <PatternFields form={form} setForm={setForm} />
      ) : (
        <ItemFields form={form} setForm={setForm} />
      )}

      <div className="flex items-center gap-2 border-t border-black/5 pt-4">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-black/85 disabled:opacity-40"
          data-testid="save-node"
        >
          저장
        </button>
        <button
          type="button"
          onClick={() => onPublish(node.id)}
          disabled={busy}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-40"
          data-testid="publish-node"
        >
          Publish
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => onDiscard(node.id)}
          disabled={busy || node.status === "published"}
          className="rounded-md border border-rose-300 px-4 py-2 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-40"
          data-testid="discard-node"
        >
          삭제 (draft only)
        </button>
      </div>

      <EdgeSection
        currentNode={node}
        outgoing={detail.outgoingEdges}
        incoming={detail.incomingEdges}
        busy={busy}
        onAddEdge={onAddEdge}
        onRemoveEdge={onRemoveEdge}
      />
    </div>
  )
}

function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wider text-black/55">
        {label}
        {hint && <span className="text-[10px] text-black/35">— {hint}</span>}
      </label>
      {children}
    </div>
  )
}

interface FormState {
  label: string
  grade: string
  displayLayer: "concept" | "pattern"
  signature: string[]
  isKiller: boolean
  frequencyRank: number | null
  avgCorrectRate: number | null
  itemSource: string
  itemYear: number | null
  itemNumber: number | null
  itemDifficulty: number | null
  itemAnswer: string
  itemSolution: string
  itemChoices: string[]
}

function PatternFields({
  form,
  setForm,
}: {
  form: FormState
  setForm: (f: FormState) => void
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Field label="학년" hint="중3 / 고1 / 수Ⅱ 등">
          <input
            value={form.grade}
            onChange={(e) => setForm({ ...form, grade: e.target.value })}
            className="w-full rounded-md border border-black/10 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="UI 계층" hint="상위 Concept / 하위 Pattern">
          <select
            value={form.displayLayer}
            onChange={(e) =>
              setForm({
                ...form,
                displayLayer: e.target.value as "concept" | "pattern",
              })
            }
            className="w-full rounded-md border border-black/10 px-3 py-2 text-sm"
          >
            <option value="concept">Concept (상위)</option>
            <option value="pattern">Pattern (하위)</option>
          </select>
        </Field>
      </div>

      <Field label="시그니처 sub-skill 목록" hint="Enter 로 줄 분리, 3~7개 권장">
        <textarea
          value={form.signature.join("\n")}
          onChange={(e) =>
            setForm({
              ...form,
              signature: e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          rows={4}
          className="w-full rounded-md border border-black/10 px-3 py-2 font-mono text-xs leading-5"
        />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="빈출 rank" hint="1=가장 빈출">
          <input
            type="number"
            value={form.frequencyRank ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                frequencyRank: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-full rounded-md border border-black/10 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="평균 정답률" hint="0.0~1.0">
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={form.avgCorrectRate ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                avgCorrectRate: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-full rounded-md border border-black/10 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="킬러/준킬러">
          <label className="flex items-center gap-2 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={form.isKiller}
              onChange={(e) =>
                setForm({ ...form, isKiller: e.target.checked })
              }
            />
            킬러 표시
          </label>
        </Field>
      </div>
    </>
  )
}

function ItemFields({
  form,
  setForm,
}: {
  form: FormState
  setForm: (f: FormState) => void
}) {
  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <Field label="출처" hint="2025수능 / 2024_9모">
          <input
            value={form.itemSource}
            onChange={(e) => setForm({ ...form, itemSource: e.target.value })}
            className="w-full rounded-md border border-black/10 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="연도">
          <input
            type="number"
            value={form.itemYear ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                itemYear: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-full rounded-md border border-black/10 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="번호">
          <input
            type="number"
            value={form.itemNumber ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                itemNumber: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-full rounded-md border border-black/10 px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <Field label="보기 (5지선다)" hint="Enter 로 줄 분리. 비워두면 주관식">
        <textarea
          value={form.itemChoices.join("\n")}
          onChange={(e) =>
            setForm({
              ...form,
              itemChoices: e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          rows={5}
          className="w-full rounded-md border border-black/10 px-3 py-2 font-mono text-xs leading-5"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="정답" hint="객관식이면 보기 텍스트와 동일하게">
          <input
            value={form.itemAnswer}
            onChange={(e) => setForm({ ...form, itemAnswer: e.target.value })}
            className="w-full rounded-md border border-black/10 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="난이도" hint="0.0~1.0 (1=어려움)">
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={form.itemDifficulty ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                itemDifficulty: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-full rounded-md border border-black/10 px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <Field label="해설 (1~2문장 핵심만)">
        <textarea
          value={form.itemSolution}
          onChange={(e) => setForm({ ...form, itemSolution: e.target.value })}
          rows={4}
          className="w-full rounded-md border border-black/10 px-3 py-2 text-sm leading-6"
        />
      </Field>
    </>
  )
}

function EdgeSection({
  currentNode,
  outgoing,
  incoming,
  busy,
  onAddEdge,
  onRemoveEdge,
}: {
  currentNode: NodeDetailResponse["node"]
  outgoing: EdgeDto[]
  incoming: EdgeDto[]
  busy: boolean
  onAddEdge: NodeEditorProps["onAddEdge"]
  onRemoveEdge: (id: string) => Promise<void>
}) {
  const [edgeType, setEdgeType] = useState<"prerequisite" | "contains">(
    "prerequisite",
  )
  const isPattern = currentNode.type === "pattern"

  // Pattern 만 source 로 엣지 추가 가능 (prerequisite·contains 둘 다 source=Pattern).
  if (!isPattern) {
    return (
      <section className="mt-4 rounded-lg border border-black/10 bg-zinc-50 p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-black/65">
          엣지 관리
        </h2>
        <p className="mb-3 text-xs text-black/55">
          Item 은 source 가 될 수 없습니다. Item 에 Pattern 을 태깅하려면 그
          Pattern 을 열어 contains 엣지로 추가하세요.
        </p>
        <EdgeList
          title="이 Item 으로 들어오는"
          rows={incoming}
          onRemove={onRemoveEdge}
          busy={busy}
        />
      </section>
    )
  }

  const targetType: "pattern" | "item" =
    edgeType === "prerequisite" ? "pattern" : "item"

  const handleSelect = async (hit: NodeSearchHitDto) => {
    await onAddEdge({
      sourceNodeId: currentNode.id,
      targetNodeId: hit.id,
      type: edgeType,
    })
  }

  return (
    <section className="mt-4 rounded-lg border border-black/10 bg-zinc-50 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-black/65">
        엣지 관리
      </h2>

      <div className="mb-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-black/65">
          <span className="font-medium">종류</span>
          <select
            value={edgeType}
            onChange={(e) =>
              setEdgeType(e.target.value as "prerequisite" | "contains")
            }
            className="rounded-md border border-black/10 px-2 py-1.5 text-sm"
            data-testid="edge-type-select"
          >
            <option value="prerequisite">prerequisite (선행 Pattern)</option>
            <option value="contains">contains (Item 포함)</option>
          </select>
        </div>
        <NodeSearch
          type={targetType}
          excludeId={currentNode.id}
          placeholder={
            edgeType === "prerequisite"
              ? "선행으로 등록할 Pattern 검색"
              : "이 Pattern 에 포함할 Item 검색"
          }
          onSelect={handleSelect}
        />
        <p className="text-[11px] text-black/45">
          검색 후 항목을 클릭하면 즉시 엣지가 추가됩니다.
          {edgeType === "prerequisite"
            ? " 사이클은 자동 거부됩니다."
            : ""}
        </p>
      </div>

      <EdgeList title="이 Pattern 에서 나가는" rows={outgoing} onRemove={onRemoveEdge} busy={busy} />
      <EdgeList
        title="이 Pattern 으로 들어오는"
        rows={incoming}
        onRemove={onRemoveEdge}
        busy={busy}
      />
    </section>
  )
}

function EdgeList({
  title,
  rows,
  onRemove,
  busy,
}: {
  title: string
  rows: EdgeDto[]
  onRemove: (id: string) => Promise<void>
  busy: boolean
}) {
  if (rows.length === 0) return null
  return (
    <div className="mb-2">
      <p className="mb-1 text-[11px] text-black/55">{title}</p>
      <ul className="flex flex-col gap-1">
        {rows.map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between rounded border border-black/5 bg-white px-3 py-1.5 text-xs"
          >
            <span className="truncate font-mono text-black/65">
              {e.type} · {e.sourceNodeId.slice(0, 8)}… → {e.targetNodeId.slice(0, 8)}…
            </span>
            <button
              type="button"
              onClick={() => onRemove(e.id)}
              disabled={busy}
              className="text-rose-600 hover:underline disabled:opacity-40"
            >
              제거
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
