# 워크스페이스 v0 진척 + 다음 세션 가이드

> 작성: 2026-05-10 18:30 KST · 갱신: 2026-05-11 (Phase 4 Path A 펜슬 오버레이 완료)
> 진척: Phase 1 (셸 + PDF) + Phase 2 (AI SDK v5 + nuqs mode + View Transitions) + Phase 3 권장 번들 4개 (PDF self-host, 약점 집계, Pretendard self-host, 타이머 chip) + Phase 4 Path A (펜 = PDF 위 absolute 오버레이)
>       lock 7 ✅ 완료. lock 8 ⏳ 부분 (펜→answer 인식은 Path C 잔여).
>       Phase 3 미진행: KaTeX (미설치 — skip), Cache Components (위험), TanStack Query (surface 넓음), 모드 swap UI (ctx 부족)
>       Phase 4 미진행: Path B (chrome 다이어트), Path C (펜→answer 인식)
> 13 lock truth source: 메모리 `project_workspace_v0_lock_decisions.md`
> 시안: `docs/workspace-mockup-2026-05-10.html`
> 리서치: 본 문서 §"기술 스택 결론" 참조

---

## 0 · 빠른 컨텍스트

오르조형 통합 워크스페이스를 D2SF 덱 PDF-centric pivot에 맞춰 구현. 단일 라우트 안에 좌(PDF chunks) / 가운데(PDF + 풀이) / 우(AI 코치) 3-pane.

**완료 8/13 lock**, 남은 5개는 Phase 2~4.

---

## 1 · 완료된 것

### Phase 1A — 셸 구조

1. 사전 점검 — Edge runtime 사용 라우트 0건. 49개 라우트 전부 `runtime = "nodejs"` 명시. Decision 12 자동 충족.
2. `nuqs` 설치 — Phase 2에서 활용.
3. `/v2/workspace/[itemId]/page.tsx` (server):
   - itemId 검증 + Item 페치 (RLS `status='published'`)
   - `contains` edges로 patternRows
   - 사용자 첫 ready document → chunks 200건
   - tier + UsageStat
   - onboard 게이트 (users.onboarded_at NULL → /v2/onboard/profile)
4. `WorkspaceClient.tsx` (client) — `react-resizable-panels` **v4 API**:
   - `Group orientation="horizontal"` (NOT `PanelGroup direction`)
   - `Panel defaultSize / minSize / maxSize` (% 단위)
   - `Separator` (NOT `PanelResizeHandle`)
   - 좌 22% (15-35%) — ChunksPane
   - 가운데 50% (35%+) — SolveClient
   - 우 28% (20-40%) — CoachPanel + "학습 지도" 탭 disabled
5. 헤더 인라인:
   - DEEPEN 로고 + breadcrumb
   - 약점 −2개 rose 캡슐 (클릭 트리거 미구현)
   - AI 사용량 emerald 캡슐 (오르조 차용 — 일 리셋 hook)
   - email
6. `/v2/home/page.tsx` 수정 — firstItem 있고 dailyDone=0이면 `/v2/workspace/[firstItemId]` redirect.

### Phase 1B — PDF 통합

1. `react-pdf 10.4.1` + `pdfjs-dist 5.4.296` 설치.
2. `_components/PdfPageViewer.tsx`:
   - react-pdf `Document` + `Page`
   - 페이지 navigator (이전/다음 + page X/Y)
   - 반응형 width (ResizeObserver)
   - **Worker CDN**: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
3. `page.tsx`에 signed URL 발급:
   - `createSupabaseAdminClient()` → `.storage.from("documents").createSignedUrl(storagePath, 3600)` (TTL 1h)
4. `WorkspaceClient` 가운데 hero 60/40 split:
   - `pdfSignedUrl` 있으면: 위 60% PDF, 아래 40% SolveClient
   - 없으면: SolveClient 풀사이즈 (Phase 1A fallback)

### 검증 상태
- `npm run build`: ✅ 성공 (Turbopack + react-pdf SSR 호환)
- `npm test`: ✅ 143/143 통과 (regression 0건)
- `npm run lint`: 내 코드 0 errors. 기존 다른 파일 `react/no-unescaped-entities` 10개는 손대지 않음.

---

## 2 · 미커밋 상태

`git status` 변경 11+ 파일:

**신규 (3)**
- `app/v2/workspace/[itemId]/page.tsx`
- `app/v2/workspace/[itemId]/WorkspaceClient.tsx`
- `app/v2/workspace/[itemId]/_components/PdfPageViewer.tsx`

**수정 (2)**
- `app/v2/home/page.tsx` — workspace redirect
- `package.json` + `package-lock.json` — nuqs / react-pdf / pdfjs-dist 추가

**시안/문서 (3)**
- `docs/workspace-mockup-2026-05-10.html` (시안 lock)
- `docs/workspace-v0-phase1-progress.md` (본 문서)
- `.claude/...memory/{project_workspace_v0_lock_decisions, project_workspace_v0_phase1_progress, feedback_graph_is_engine_not_hero}.md` (메모리)

다음 세션 권장 **첫 액션**: dev server 동작 검증 → 문제 없으면 단일 커밋.

---

## 3 · 13 lock 진척

| # | 결정 | 1A | 1B | 2·3 | 남음 |
|---|---|:-:|:-:|:-:|---|
| 1 | 패널 비율 280/flex/380 | ✅ | | | |
| **2** | **그래프 토글 (탭 + 헤더 카피)** | placeholder | | **✅** | nuqs `?right=coach\|graph` + 약점 캡슐·탭 동일 setter. View Transitions 는 stable React 미포함 → CSS transition |
| 3 | AI 사용량 emerald 캡슐 | ✅ | | | |
| **4** | **채점 결과 hero 인라인** | | | **✅** | `<ResultPanel inline>` — `fixed inset-0` → `relative w-full` |
| **5** | **리캡 인라인 + mini graph** | | | **✅(부분)** | `<RecapOverlay inline>` — 인라인 정상. mini graph 자동 등장은 미구현 (별도 컴포넌트) |
| **6** | **원본 PDF 페이지 렌더** | | **✅** | | |
| 7 | 펜슬 PDF 위 오버레이 | | | | Phase 4 — `perfect-freehand` or tldraw |
| **8** | **정답 펜+칩 둘 다** | | | **부분** | 칩 측 `solve-store.selectedAnswer` 공유 상태 그대로 (이미 됨). 펜 → answer 인식은 Phase 4 펜슬 오버레이 동시 구현 |
| 9 | /v2/home → workspace redirect | ✅ | | | |
| 10 | /v2/workspace/[itemId] 라우트 | ✅ | | | |
| 11 | Vercel AI SDK v6 | | | skip | 자체 SSE 프로토콜(token/card/highlight/similar) 깊게 묶여 있어 마이그레이션 비용 > 이득. `@ai-sdk/anthropic` 모델 교체로 점진 가능 |
| 12 | Edge → Node | ✅ (no-op) | | | |
| **13** | **PDF.js 도입** | | **✅** | | |

**진척**: 8/13 → **11/13 완전 + 1/13 부분 + 1/13 보류** (8 부분, 11 보류).

---

## 4 · 다음 세션 — 진입 체크리스트 (5분)

1. `npm run dev`
2. `/v2/home` 접속 → `/v2/workspace/[firstItemId]` redirect 확인
3. PDF 업로드된 계정으로 진입 → 가운데 상단에 PDF 페이지 렌더 확인
4. PDF 없는 계정으로 진입 → SolveClient만 풀사이즈 fallback 확인
5. 좌측 ChunksPane 텍스트 드래그 → 우측 코치 input 자동 채움 확인
6. 헤더 AI 사용량 캡슐 ("AI X/N 오늘") 표시 확인
7. 패널 사이 hairline 잡고 드래그 → 비율 변경 확인

문제 없으면 **단일 커밋** 후 Phase 2 진입.

---

## 5 · Phase 2 — AI SDK + URL state + View Transitions (✅ 2026-05-11)

### 5.1 AI SDK 풀 마이그레이션 — ✅
**버전 정렬**: `ai@5.0.186` + `@ai-sdk/anthropic@2.0.79` + `@ai-sdk/react@2.0.188`.
원래 lock 11 카피는 "v6" 였으나 v6 stable 의 React 바인딩이 없음 (v6↔react canary 만, react v2↔ai v5 가 유일한 stable 페어).
실 록은 "useChat 훅 도입" 이므로 v5 stable 로 정렬.

**서버 (`/api/ai-coach/chat`)**:
- 자체 SSE (`event: token/card/highlight/similar/done`) → `createUIMessageStream` + `writer.merge(streamText(...).toUIMessageStream())`
- 모델 호출: `streamText({ model: anthropic(env.CLAUDE_MODEL), tools, onFinish })`
- tool 3종 인라인 `tool({ inputSchema: z.object(...), execute })`:
  - `insert_recap_card` — DB buildRecapCard 호출 후 `writer.write({ type: 'data-card', data })`
  - `highlight_graph_nodes` — `writer.write({ type: 'data-highlight', transient: true })`
  - `find_similar_items` — `writer.write({ type: 'data-similar', transient: true })`
- `stopWhen: stepCountIs(2)` — tool 실행 후 LLM 한 번 더 회전하지 않게
- cache_control 은 v5 의 `allowSystemInMessages: true` + system message 의 `providerOptions.anthropic.cacheControl` 로 보존
- quota 429 / onFinish recordAiCall / features.aiCoach 503 모두 보존

**클라 (`CoachPanel.tsx`)**:
- 자체 fetch + `readSse()` (~100줄) → `useChat({ id: itemId, transport: DefaultChatTransport })`
- `prepareSendMessagesRequest` 로 body 에 itemId + chipKey + messages 합성
- `customFetch` 로 429 가로채 store.quotaError 채움 (DefaultChatTransport.fetch 옵션)
- `onData` 가 highlight/similar 만 store 에 반영 (transient)
- card 는 message.parts (`data-card`) 에 자동 누적 → `CoachMessage` 가 직접 렌더
- store 메시지 prefill bridge 는 `useCoachStore.subscribe` 콜백으로 (react-hooks/set-state-in-effect 회피)

**store (`coach-store.ts`)**:
- messages / streaming / push* / appendDelta / setError / attachCard 제거 (useChat 이 보유)
- 남은 필드: open / itemId / highlightNodeIds / similarItems / quotaError / inputPrefill
- 91 줄 → 70 줄

**삭제**:
- `streamClaude()` (lib/clients/claude.ts)
- `lib/ai-coach/tools.ts` (COACH_TOOLS — 라우트가 인라인 정의)

**타입**: `lib/ai-coach/coach-message.ts` 신규 — `CoachUIMessage = UIMessage<unknown, CoachDataParts>`

### 5.2 nuqs `?mode` 쿼리 상태 — ✅
- `useQueryState('mode', parseAsStringEnum(['practice','challenge','retry','daily']).withDefault('practice'))`
- `daily` → SolveClient 의 `from='daily'` 로 매핑
- 모드 swap UI 는 미구현 (Phase 3 폴리싱 또는 challenge/retry 라우트 도입 시)

### 5.3 View Transitions API — ✅
- React 19.2 stable 이 `ViewTransition` 컴포넌트 미노출 → browser-native `document.startViewTransition` 직접 호출
- `swapRight(next)` 헬퍼: 지원 브라우저는 crossfade, 미지원은 즉시 swap fallback
- 우 패널 컨테이너에 `style={{ viewTransitionName: 'workspace-right-panel' }}`
- 약점 캡슐 + 우 탭 클릭 모두 동일 헬퍼 경유

### 검증
- `tsc --noEmit`: ✅
- `npm test`: ✅ 143/143
- `npm run build`: ✅
- `npm run lint`: ✅ (내 코드 0)

---

## 6 · Phase 3 — 폴리싱 (✅ 2026-05-11, 권장 번들 4개)

### 6.1 PDF.js worker self-host — ✅
- `cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/`
- `PdfPageViewer.tsx`: workerSrc `cdnjs.cloudflare.com` → `/pdf.worker.min.mjs`
- 1MB self-host. 버전은 pdfjs-dist 와 자동 정합.

### 6.2 약점 −N개 실제 집계 — ✅
- `/v2/workspace/[itemId]/page.tsx`: `SELECT COUNT(*) FROM pattern_state WHERE user_id=$1 AND theta < 0.4` 추가
- `WorkspaceClient` 에 `weakCount: number` prop 전달
- `weakCount > 0` 일 때만 캡슐 렌더 (0 이면 hide)
- 임계값: 0.4 — `/v2/graph` mock 의 isWeak 컨벤션과 정합

### 6.3 Pretendard 동적 서브셋 (self-host) — ✅
- 이전: `<link rel="stylesheet" href="cdn.jsdelivr.net/.../pretendardvariable.min.css">`
- 변경: `public/fonts/PretendardVariable.woff2` (2.06MB 단일 가변 폰트) + `next/font/local`
- `display: "swap"` (시스템 폰트로 먼저 paint → Pretendard 로 swap, FOUT 허용)
- `--font-pretendard` CSS var 주입 + `app/v2/layout.tsx` fontFamily stack 에 var 추가
- CDN 의존성 제거 (render-blocking external request 제거)
- Nunito 도 `--font-nunito` variable 로 정리

### 6.4 SolveClient 시각 중복 해결 — ✅ (분해는 미진행)
- 조사 결과: `embedded` prop 이 이미 헤더/sticky footer/floating panel 적절히 hide → **시각 중복 자체는 없음**
- 진짜 문제: embedded 모드에서 **타이머가 안 보임** (헤더 통째 hide)
- 수정: embedded 일 때 본문 상단에 슬림 chip 한 줄 (모드 + Timer/ExamTimer) 추가
- 구조 분해 (SolveHeader/SolveFooter 분리) 는 호출처 없어 over-engineering — 다음 라운드 미룸

### 6.5 KaTeX SSR — ⏭ skip
- 조사 결과: `ItemBody.tsx` 의 "KaTeX 도입은 M1.4 에 미룸 — 콘텐츠 시드 형식 확정 후" 코멘트 확인. KaTeX 미설치/미사용. 작업 불요.

### 미진행 (별도 phase 권장)
- Cache Components (Next 16 canary 단계, 캐시 invalidation 위험)
- TanStack Query (마이그레이션 surface 넓음, 1일+)
- 모드 swap UI (challenge/retry ctx 없이 UI 만 깔면 더미)

### 검증
- `tsc --noEmit`: ✅
- `npm test`: ✅ 143/143
- `npm run build`: ✅
- `npm run lint`: ✅ (내 코드 0 errors)

---

## 7 · Phase 4 — 펜슬 PDF 오버레이 (✅ Path A 2026-05-11)

**기술 결정 재확인**: tldraw 5.0.0 이 이미 도입돼 PencilPanel + persistence + export-png 까지 동작 중. "tldraw vs perfect-freehand" 결정은 사실상 **이미 tldraw 로 결정·구현 완료** (lock 7 의 "기술 결정 필요" 는 stale).
**원 추정 2~3일은 풀스코프 가정**. 실 작업은 훨씬 작음 — Path A 는 한 세션 (~1시간).

### Path A — 최소 오버레이 (✅)
**구현**
- `PdfPageViewer` 에 `overlay?: ReactNode` prop 추가 → body 컨테이너에 `relative` + 그 안에 `absolute inset-0` overlay slot
- `PencilPanel` 에 `variant: 'panel' | 'overlay'` prop 추가
  - `'overlay'` 시 outer = `absolute inset-0 flex flex-col`, toolbar/footer 는 `bg-white/85 backdrop-blur-sm` chip, canvas `flex-1 min-h-0`
  - `'panel'` 기본 = 기존 카드 (h-[420px]) 유지
- `WorkspaceClient` 가 pencil state (`pencilPng/ocrResult/ocrPending/ocrError`) + OCR fetch 보유, `<PdfPageViewer overlay={<PencilPanel variant="overlay" ... />}>` 로 렌더
- `SolveClient` 에 inject props 추가 (`injectedPencilPng/injectedOcrResult/...`). `overlayPencilHosted` 면 자체 PencilPanel 블록 스킵하고 `OcrResultPanel` 만 inject 된 값으로 렌더 (Accept-and-grade UX 보존)
- standalone `/v2/solve` 는 inject props 미주입 → 기존 PencilPanel 그대로

**결과**
- lock 7 충족: 펜 = PDF 위 직접 오버레이 (박스 분리 fallback 해제)
- lock 8 부분: 칩 측 store 공유 + 펜으로 답 인식까지는 Path C 잔여 (Phase 4 후속)
- standalone 회귀 0 (props 미주입 분기 보존)

### Path B — tldraw chrome 다이어트 (✅)
- `PencilCanvasHost`: `<Tldraw hideUi />` + 마운트 시 `editor.setCurrentTool('draw')` 강제
- `PencilPanel`: PEN_COLORS → `DefaultColorStyle` ('black'|'blue'|'red'), PEN_SIZES → `DefaultSizeStyle` ('s'|'m'|'l') 매핑. `setStyleForNextShapes` 로 실 펜 stroke 에 반영
- `PencilToolbar`: 옵셔널 `onUndo`/`onRedo` prop 추가 (↶ ↷ 버튼). overlay + panel 모드 둘 다 노출
- 도구 선택/이동/줌 등 tldraw 내장 UI 제거 — 커스텀 툴바만 남음 → 워크스페이스/standalone 시각 일관성 확보

### Path C — 펜→answer 인식 (lock 8 잔여, 미진행)
- 펜으로 ◯ 그린 영역 좌표 → 5지선다 답 자동 인식
- OCR 라우트 request 에 boundingBoxes 추가 필요 (후방호환 유지 가능)

### Path D — 풀 좌표 시스템 재설계 (skip)
- ROI 낮음. 진짜 필요 시점 도래 후 결정.

### 검증
- `tsc --noEmit`: ✅
- `npm test`: ✅ 143/143
- `npm run build`: ✅
- `npm run lint`: ✅ (내 코드 0 errors)
- 시각 검증: 미실측 (DB 빈 상태 — published item 시드 후 가능)

---

## 8 · 알려진 gotcha 6개

1. **react-resizable-panels v4 API 다름** — `Group` (not PanelGroup), `Separator` (not PanelResizeHandle), `orientation` (not direction). v3 docs 잘못 적용 X. DualClient는 v4 API 미사용 (CSS grid).
2. **react-pdf worker CDN 의존** — 현재 `cdnjs.cloudflare.com` 사용. 프로덕션 안정성 위해 Phase 3에서 `public/pdf.worker.min.mjs` self-host 권장.
3. **PDF 없는 사용자 fallback** — `pdfSignedUrl` null이면 SolveClient만 풀사이즈. 워크스페이스 시안과 시각 차이. Phase 2/3에서 시드 PDF 또는 stub 처리 검토.
4. **SolveClient 자체 헤더/footer** — 가운데에 SolveClient의 mode/timer 헤더가 있어서 워크스페이스 헤더와 시각 중복. Phase 2/3 폴리싱에서 분해 필요.
5. **nuqs 설치만 하고 미사용** — Phase 2 진입 시 활용. 현재는 dependency만.
6. **`lib/clients/claude.ts` 단일 client** — 모든 Anthropic 호출 이 client 경유. AI SDK 마이그레이션 시 한 곳만 바꾸면 전파됨. 라우트별 개별 마이그레이션 불필요.

---

## 9 · 참조

- 13 lock truth: 메모리 `project_workspace_v0_lock_decisions.md`
- 그래프 강등 결정: 메모리 `feedback_graph_is_engine_not_hero.md`
- PDF-centric pivot: 메모리 `project_v2_pdf_centric_pivot.md`
- 시안 (브라우저): `docs/workspace-mockup-2026-05-10.html`
- 오르조 벤치마킹: `docs/orzo-benchmarking-2026-05-09.md`
- 기술 스택 클론 가이드: `docs/orzo-tech-stack-clone-guide-2026-05-09.md`
- 마일스톤 정의: `docs/build-spec/00-INDEX.md` ~ `13-deployment.md`
