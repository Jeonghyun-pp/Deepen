# Deepen v2 재설계 — UX 정리

> Graph 중심 Research OS로의 전환. 모든 데이터는 graph, 모든 기능은 graph projection.

작성일: 2026-04-11
범위: Phase 0 ~ Phase 8 (mock data 기반 v2 재설계)

---

## 🎯 핵심 아키텍처 변화

| Before | After |
|---|---|
| 분리된 2개 데이터 소스 (graph + 6-layer text) | **단일 graph dataset** |
| 텍스트 6-layer 탭 UI | **typed edges + projection sections** |
| Mock Q&A chat | **5-iter tool loop with approval** |
| Static hardcoded roadmaps | **find_path 기반 dynamic overlay** |
| `/search` redirect | **3-column 실제 entry point** |
| Click → FloatingMemo (2-step doc 열기) | **Click → DocDetailView, Shift+click → Memo** |
| Tree layout 기본 (multiple roots 위험) | **Force-directed 기본 + 단일 connected graph** |

---

## 🧭 확정된 UX 결정사항

| 결정 | 내용 |
|---|---|
| **Click** | Node click → DocDetailView 중앙 canvas 탭 열기 (RightPanel 아님) |
| **Shift+Click** | FloatingMemo 띄우기 (graph 탭 유지) |
| **Hover** | 150ms delay 후 Preview Tooltip (FloatingMemo와 겹침 허용) |
| **Roadmap** | Graph overlay 형태, 활성화 중에도 다른 노드 자유 탐색 가능 |
| **RightPanel** | 4탭 유지 (노드 상세 / 메모 에디터 / Chat / 파일 업로드) |
| **DocDetailView** | 중앙 canvas tab으로 유지 (RightPanel로 이동 X) |

---

## 📊 통계

- **신규 파일**: 12개
- **삭제 파일**: 6개 + 2개 디렉토리
- **수정 파일**: 16개
- **신규 코드**: ~2,500줄
- **최종 빌드**: ✓ 9 routes 정상 컴파일

---

## Phase 0 · 타입 기반 확장

### 수정

**`app/graph/_data/types.ts`**
- `NodeType` 확장: `paper, concept, memo, document` → `+technique, application, question` (총 7개)
- `EdgeType` 확장: legacy 5개 + typed relations 6개 (`introduces, uses, extends, appliedIn, raises, relatedTo`)
- `GraphNode`에 `tldr?: string` 필드 추가
- `GraphEdge`에 `note?: string` 필드 추가 (관계 설명)

**`app/graph/_data/colors.ts`**
- `NODE_COLORS`: technique=teal, application=rose, question=yellow-dark 추가
- `EDGE_COLORS`: 6개 typed relation 색상 추가
- `TYPE_LABELS`, `EDGE_TYPE_LABELS` 확장

**`app/graph/_components/{FilterBar,LeftSidebar}.tsx`** + **`useGraphData.ts`**
- 필터 기본값에 새 노드 타입 7개 모두 포함

---

## Phase 1 · 데이터 통합 [BREAKING]

### 신규

**`app/graph/_data/projection.ts`** — graph projection 핵심 유틸
- `getPaperSubgraph(data, centerId, relationTypes)` — 노드 중심 typed-edge 기반 subgraph
- `getPathBetween(data, startId, goalId)` — BFS 최단 경로
- `getNeighbors(data, nodeId)` — 1-hop 이웃
- `findNodeByLabel(data, query)` — fuzzy label 매칭
- `DEFAULT_SECTION_ORDER` — DocDetailView 섹션 우선순위

### 재작성

**`app/graph/_data/sample-data.ts`** — 단일 unified graph dataset
- 9개 Paper (Transformer, BERT, GPT-3, ViT, ResNet, DDPM, CLIP, Seq2Seq, CoT)
- 8개 Concept + 6개 Technique + 5개 Application + 5개 Question + 3 Memo + 2 Document
- 65개 typed edges (introduces/uses/extends/appliedIn/raises/citation/relatedTo/manual)
- `GraphData.roadmaps` 필드 제거

### 삭제

- `lib/mock/analysis.ts` (6-layer 텍스트 mock)
- `lib/mock/roadmap.ts` (static roadmap)
- `lib/mock/` 디렉토리
- `app/papers/[id]/_components/` (dead code: SixLayerTabs, LayerContent, CitationCarousel)
- `app/roadmap/_components/` (dead code: RoadmapTimeline, RoadmapStepCard, KeywordInput)

---

## Phase 2 · DocDetailView 재작성

### 신규

**`app/graph/_components/doc/relation-meta.ts`**
- `RELATION_META: Record<EdgeType, {label, description, icon, color}>`
- 각 relation type별 한국어 라벨, 아이콘(Lucide), 색상 매핑

**`app/graph/_components/doc/ProjectionSection.tsx`**
- 섹션 단위 렌더링 (icon header + clickable 노드 카드 리스트)
- 각 카드: 노드 색 dot + label + type badge + edge.note
- click → `onItemClick(targetId)`

### 재작성

**`app/graph/_components/DocDetailView.tsx`**
- 6-layer 텍스트 탭 → graph projection sections
- Header: type badge, label, year, authors, citations, TLDR
- Sections: introduces / uses / extends / appliedIn / raises / citation
- Empty state: "관계 정보가 아직 없습니다"
- 새 props: `graphData`, `onNavigateToNode`

### 수정

**`app/graph/_components/CanvasArea.tsx`**
- DocDetailView 호출에 `graphData={filteredData}` + `onNavigateToNode={onNodeSelect}` 전달

---

## Phase 3 · GraphCanvas Interaction

### 신규

**`app/graph/_components/NodePreviewTooltip.tsx`**
- Portal 기반 hover preview card
- TOOLTIP_W=260, viewport edge clamping
- 노드 색 dot + type badge + year + tldr + edge count + 단축키 hint
- z-9998 (FloatingMemo 9999보다 아래)

### 수정

**`app/graph/_components/GraphCanvas.tsx`**
- `NodeClickEvent`에 `shiftKey: boolean` 추가
- `NodeHoverEvent` 인터페이스 신규
- `onNodeClick` event에서 `event.nativeEvent.shiftKey` 전달
- `onNodePointerOver` / `onNodePointerOut` 핸들러 + 150ms delay timer
- `lastPointer` ref로 마우스 좌표 추적
- `onCanvasClick`도 hover 상태 클리어

**`app/graph/_components/GraphShell.tsx`**
- `handleNodeClick`에서 `event.shiftKey` 분기:
  - **shift+click** → FloatingMemo 표시 (graph 탭 유지)
  - **일반 click** → DocDetailView 탭 열기
- `handleNodeHover` 핸들러 + `hoverPreview` state
- `NodePreviewTooltip` 렌더링 (graph 탭일 때만)

**`app/graph/_components/CanvasArea.tsx`**
- `onNodeHover?` props 전달

---

## Phase 4 · Agent Tool Loop

### 신규 디렉토리: `lib/agent/tools/`

**`types.ts`** — `Tool<Args>` interface, `ToolContext`, `ToolExecutionResult`, `buildPreview?`

**6개 tool 구현**:
- **`query-graph.ts`** — nodeId/label/type/relationType 필터, 1-hop 이웃 반환
- **`find-path.ts`** — startId/goalId BFS 경로, label fuzzy 해석
- **`extract-concepts.ts`** — paper의 introduces/uses 개념 추출
- **`search-papers-openalex.ts`** — 외부 OpenAlex 검색
- **`add-node.ts`** — 노드 추가 (approval 필요)
- **`add-edge.ts`** — 엣지 추가 (approval 필요)

**`index.ts`** — `TOOLS` registry + `getToolSchemas()` (OpenAI tool format)

### 신규

**`lib/agent/approval.ts`**
- `waitForApproval(sessionId)` — Promise 기반 대기 (5분 timeout)
- `resolveApproval(sessionId, decisions)` — in-memory map resolve
- 동일 sessionId 재요청 시 기존 pending 거부 처리

**`app/api/agent/approve/route.ts`**
- POST `{sessionId, decisions}` → `resolveApproval` 호출

### 재작성

**`lib/agent/types.ts`** — `AgentEvent` 확장:
- `ToolCall`, `ToolResult`, `ApprovalItem` 인터페이스
- 새 이벤트: `tool_call_start`, `tool_result`, `batch_approval`, `approval_resolved`

**`lib/agent/runner.ts`** — text-only → 5-iteration tool loop
- `callOpenAIWithTools` 호출 → `tool_calls` 수신 시 분기
- approval-필요 vs 자동 분리
- batch_approval 이벤트 + `waitForApproval` await
- tool 실행 → result event → history에 summary append (토큰 절약)
- 거부된 mutation은 "사용자가 거부함"으로 결과 처리

**`lib/agent/prompt.ts`** — system prompt에 도구 사용 가이드 + 원칙(노드 ID 명시, 그래프 우선) 추가

**`app/graph/_hooks/useAgent.ts`** — 대규모 재작성
- `ChatMessageToolEntry` (call + result + status)
- 새 이벤트 핸들링: `tool_call_start`, `tool_result`, `batch_approval`, `approval_resolved`
- `sessionRef`로 sessionId 유지
- `approve` 함수 — `/api/agent/approve` POST
- `handlers.onAddNode/onAddEdge` 콜백 — mutation 결과를 client store에 반영

### 수정

**`lib/clients/openai.ts`**
- `callOpenAIWithTools()` 신규 — async generator로 text_delta + tool_calls 스트리밍
- 누적 buffer로 tool_call arguments 조립 후 JSON.parse
- (Phase 8) `getClient()` lazy init으로 build 시 API key 부재 대응

**`app/api/agent/chat/route.ts`**
- request body에 `sessionId` 추가
- `runAgent(messages, graphData, sessionId)` 호출

---

## Phase 5 · Roadmap Overlay

### 신규

**`app/graph/_components/RoadmapOverlay.tsx`**
- Floating top bar: step counter, current node label, 종료 버튼
- Dot track: 진행도 표시 + jump-to 클릭
- Nav: 이전/다음 버튼 + 현재 노드 tldr 표시
- pointer-events 분리로 그래프 인터랙션 차단 안 함

### 수정

**`app/graph/_data/types.ts`**
- `RoadmapModule`, `RoadmapEntry` 인터페이스 **삭제**
- `GraphData.roadmaps` 필드 **삭제**
- `CanvasTabType`에서 `"roadmap-timeline"` 제거
- `CanvasTab.roadmapId` 필드 제거
- `RoadmapOverlayState` 신규 (pathNodeIds, currentIndex, title)

**`app/graph/_hooks/useGraphData.ts`** — 대규모 정리
- 제거: `activeRoadmapId`, `setActiveRoadmapId`, `addRoadmap`, `removeRoadmap`, `addNodeToRoadmap`, `removeNodeFromRoadmap`, `openRoadmapTab`, `activeRoadmapNodeIds`
- 추가: `roadmapOverlay` state + `activateRoadmapOverlay`, `advanceRoadmap`, `backRoadmap`, `jumpRoadmap`, `clearRoadmapOverlay`
- 추가: `addNode(node)`, `addEdge(edge)` (agent mutation 반영용)

**`app/graph/_components/CanvasTabBar.tsx`**
- `TAB_ICONS`에서 `"roadmap-timeline": Map` 제거 (Map import 제거)

**`app/graph/_components/CanvasArea.tsx`**
- `RoadmapTimelineView` import 및 탭 렌더링 블록 제거
- `roadmaps`, `onDocTabOpen`, `RoadmapModule` 의존 제거

**`app/graph/_components/LeftSidebar.tsx`** — 대규모 단순화
- Roadmap list/add/remove 섹션 전부 제거
- 노드 타입별 그룹 리스트로 대체 (검색·필터 적용 후 정렬)
- 헤더, 검색, 필터, 노드 리스트, 노트, gap 분석 만 유지

**`app/graph/_components/GraphShell.tsx`**
- `RoadmapOverlay` import + 렌더링 추가 (graph 탭일 때만)
- `useAgent`에 `{onAddNode, onAddEdge}` handler 전달
- `actives` 계산에 `pathNodeIds` 합집합
- `LeftSidebar`/`CanvasArea` 호출에서 roadmap 관련 props 제거
- overlay 제어 콜백 (advance/back/jumpTo/clear) + 카메라 이동

### 삭제

- `app/graph/_components/RoadmapTimelineView.tsx`

### 수정 (cleanup)

**`app/graph/_data/sample-data.ts`**, **`app/graph/_components/ExportModal.tsx`**
- `roadmaps` 필드 참조 제거

---

## Phase 6 · ChatPanel Tool UI

### 신규

**`app/graph/_components/chat/ToolCallCard.tsx`**
- `TOOL_META` 매핑 (6개 tool별 label/icon/color)
- 접기/펼치기 + 상태 표시 (running spinner / done check / error)
- 펼침 시: args JSON, error 메시지
- `find_path` 결과: "그래프에 경로 표시" 버튼 → `onActivateRoadmap(pathNodeIds)`
- `query_graph`/`extract_concepts` 결과: 노드 chip 클릭으로 navigation

**`app/graph/_components/chat/ApprovalCard.tsx`**
- 노란 amber 배경, ShieldAlert 아이콘
- 각 mutation의 preview 텍스트 카드
- "모두 거부" / "모두 승인" 버튼 → `onResolve(decisions)`
- resolved 후 자동 숨김

### 재작성

**`app/graph/_components/ChatPanel.tsx`**
- `toolEntries` 배열 렌더링 (`ToolCallCard`)
- `pendingApproval` 렌더링 (`ApprovalCard`)
- 새 props: `onApprove`, `onActivateRoadmap`, `onNavigateToNode`
- 빈 상태 예시 메시지 추가 ("Transformer 핵심 개념?", "RNN에서 ViT까지 경로")

### 수정

**`app/graph/_components/RightPanel.tsx`**
- Props: `onAgentApprove`, `onActivateRoadmap` 추가
- `ChatPanel` 호출에 새 props 전달 (`onNavigateToNode={onNodeClick}`)

**`app/graph/_components/GraphShell.tsx`**
- `RightPanel`에 `onAgentApprove={agent.approve}` 전달
- `onActivateRoadmap` 콜백 — `activateRoadmapOverlay` + 탭 전환 + 카메라 이동

---

## Phase 7 · /search Entry Point

### 재작성

**`app/search/page.tsx`** (기존 redirect 1줄 → 270줄)
- 헤더 (Deepen 로고, 그래프 바로가기 링크)
- Search hero: 자동 포커스 input, fuzzy 매칭, 결과 dropdown
- Enter → 첫 매칭 노드로 이동
- 3-column 추천:
  - **주요 논문** (citation 순 정렬, 6개)
  - **핵심 개념** (introduces/uses edge 카운트 순, chip 형태)
  - **추천 로드맵** (3개 preset prompt)
- 클릭 → `/graph?focus=${nodeId}` 또는 `/graph?roadmap=${prompt}`

### 수정

**`app/graph/page.tsx`**
- `<Suspense>` wrapper 추가 (useSearchParams 요구사항)

**`app/graph/_components/GraphShell.tsx`**
- `useSearchParams` 훅 추가
- `useEffect`로 query param 처리:
  - `?focus=nodeId` → `selectNode` + `openDocTab` + 카메라 이동
  - `?roadmap=prompt` → chat 탭 활성 + agent에 메시지 전송 (자동 find_path 호출)

---

## Phase 8 · Cleanup & Build

### 수정

**`lib/clients/openai.ts`**
- 모듈 로드 시점의 `new OpenAI()` 호출 → `getClient()` lazy init
- Build 시 `OPENAI_API_KEY` 부재해도 page data collection 통과
- 3개 호출 위치(`callOpenAI`, `streamOpenAIChat`, `callOpenAIWithTools`) 모두 `getClient()` 사용

**`app/graph/_components/NodePreviewTooltip.tsx`**
- `useEffect(() => setMounted(true), [])` 안티패턴 제거 (lint 경고)
- `typeof window === "undefined"` 가드로 SSR 안전성 확보

### 검증

- `grep -r "SixLayerAnalysis|getMockAnalysis|RoadmapTimelineView|roadmap-timeline|lib/mock"` → docs 외 결과 없음
- `npx tsc --noEmit` → exit 0
- `npx next build` → 9 routes 정상 컴파일 (`/`, `/graph`, `/search`, `/lab`, `/api/agent/{chat,approve}`, `/api/papers/{search,[id]}`, `/papers/[id]`, `/roadmap`)

---

## 🐛 후속 수정: "multiple roots" 런타임 에러

### 원인
Reagraph의 tree layout이 단일 루트를 요구하는데:
1. 기본 레이아웃이 `treeTd`로 설정됨
2. DDPM(p6) 클러스터가 메인 그래프와 분리됨 (33+5 = 2 connected components)

### 수정 1 — 기본 레이아웃 변경
`app/graph/_hooks/useGraphData.ts:53`
```diff
- const [layoutId, setLayoutIdRaw] = useState<LayoutId>("treeTd");
+ const [layoutId, setLayoutIdRaw] = useState<LayoutId>("forceDirected");
```

### 수정 2 — 그래프 연결성 보강
`app/graph/_data/sample-data.ts` — DDPM 클러스터 연결을 위해 edge 2개 추가:
```ts
{ id: "e_cite_p7_p6", source: "p7", target: "p6", type: "citation",
  label: "생성 모델 비교", weight: 0.4 },
{ id: "e_p6_uses_res", source: "p6", target: "c_residual", type: "uses",
  weight: 0.5, note: "U-Net backbone에 Residual block 활용" },
```

### 결과
- Connected components: **2 → 1**
- Total edges: 63 → 65
- 런타임 "multiple roots" 에러 해소

---

## ⚠️ 알려진 한계

- `NoteCanvasView.tsx:281` lint warning — 기존 코드, 본 작업 범위 외
- Approval queue가 in-memory — serverless 다중 인스턴스 환경 미지원, mock 단계 OK
- `OPENAI_API_KEY` 미설정 시 build는 통과하지만 런타임 chat 호출 실패 — `.env.local`에 설정 필요
- Reagraph는 path 노드를 `actives`로 강조하지만 별도 path edge 강조는 미구현

---

## ✅ 성공 기준 검증

| 기준 | 결과 | 메커니즘 |
|---|---|---|
| Graph만으로 논문 관계 이해 가능 | ✓ | typed edges (introduces/uses/extends/appliedIn/raises) |
| Node click → 즉시 맥락 이해 | ✓ | click이 DocDetailView 탭을 즉시 열고 graph projection 표시 |
| 하나의 논문에서 학습 경로 생성 | ✓ | agent `find_path` tool + RoadmapOverlay 활성화 |
| 모든 정보가 Graph에서 추적 가능 | ✓ | 단일 `sampleGraphData`가 진실의 원천 |

---

## 🔧 실행 방법

```bash
# .env.local에 OPENAI_API_KEY 설정 후
npm run dev
# → http://localhost:3000/search 진입
```
