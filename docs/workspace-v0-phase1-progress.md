# 워크스페이스 v0 Phase 1 진척 + 다음 세션 가이드

> 작성: 2026-05-10 18:30 KST
> 진척: Phase 1A + 1B 완료. Phase 2~4 미진행. **미커밋.**
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

| # | 결정 | 1A | 1B | 남음 |
|---|---|:-:|:-:|---|
| 1 | 패널 비율 280/flex/380 | ✅ | | |
| 2 | 그래프 토글 (탭 + 헤더 카피) | placeholder | | Phase 2 — View Transitions + nuqs swap |
| 3 | AI 사용량 emerald 캡슐 | ✅ | | |
| 4 | 채점 결과 hero 인라인 | (SolveClient 내장) | | Phase 2/3 — SolveClient 분해 |
| 5 | 리캡 인라인 + mini graph | (SolveClient 내장) | | Phase 2/3 |
| **6** | **원본 PDF 페이지 렌더** | | **✅** | |
| 7 | 펜슬 PDF 위 오버레이 | | | Phase 4 — `perfect-freehand` or tldraw |
| 8 | 정답 펜+칩 둘 다 | (SolveClient 내장) | | Phase 2/3 |
| 9 | /v2/home → workspace redirect | ✅ | | |
| 10 | /v2/workspace/[itemId] 라우트 | ✅ | | |
| 11 | Vercel AI SDK v6 | | | Phase 2 — `ai` + `@ai-sdk/anthropic` |
| 12 | Edge → Node | ✅ (no-op) | | |
| **13** | **PDF.js 도입** | | **✅** | |

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

## 5 · Phase 2 — AI SDK + URL state (~2일)

### 5.1 Vercel AI SDK v6 마이그레이션
- `npm install ai @ai-sdk/anthropic`
- `lib/clients/claude.ts` → AI SDK wrapper 추가 또는 교체 (한 곳만 바꾸면 모든 라우트 전파)
- `app/api/ai-coach/chat/route.ts`:
  ```ts
  import { streamText } from 'ai'
  import { anthropic } from '@ai-sdk/anthropic'
  return streamText({
    model: anthropic('claude-sonnet-4-5'),
    messages,
  }).toDataStreamResponse()
  ```
- `CoachPanel.tsx` → `useChat` 훅으로 메시지 누적/스트리밍/에러 처리 위임 (~200줄 감소)
- 기존 tool_use 분기 (card / highlight / similar) 보존 필요 — `useChat` onToolCall 후크 활용

### 5.2 URL state mode swap (nuqs)
- `useQueryState('mode', parseAsStringEnum(['practice','challenge','retry','daily']).withDefault('practice'))` — shallow
- `useQueryState('right', parseAsStringEnum(['coach','graph']).withDefault('coach'))` — 우 패널 swap
- 약점 카피 클릭 → `setRight('graph')` 트리거
- 우 패널 탭 클릭 → 동일 setter

### 5.3 View Transitions API (선택, React 19.2)
- `import { ViewTransition, unstable_addTransitionType } from 'react'`
- 우 패널 swap 감쌈:
  ```tsx
  <ViewTransition name="right-panel">
    {right === 'coach' ? <CoachPanel /> : <GraphPanel />}
  </ViewTransition>
  ```
- `useTransition` + `addTransitionType('panel-swap')`로 부드러운 전환

---

## 6 · Phase 3 — 폴리싱 (~1~2일)

- **KaTeX SSR** — 수능 적분/시그마 첫 paint 막힘 방지. RSC `renderToString`.
- **Cache Components** — `next.config.ts`에 `cacheComponents: true`. 라우트별 `'use cache'` + `cacheLife('max')` + `cacheTag`.
- **Pretendard 동적 서브셋** — `next/font/local` + 한글 글리프만.
- **TanStack Query** — 서버 캐시(`'use cache'`) + 클라 mutation 분리.
- **"약점 −N개" 실제 집계** — patternState theta < 0.4 카운트.
- **약점 카피 클릭 동작 wire up** — Phase 2의 nuqs swap과 연결.
- **SolveClient 분해** — 워크스페이스 헤더와 시각 중복 제거. 자체 헤더/footer 분리해서 워크스페이스 외부에서 호스팅 가능하게.
- **PDF self-host worker** — `public/pdf.worker.min.mjs` 복사 + workerSrc 변경. CDN 의존성 제거.

---

## 7 · Phase 4 — 펜슬 PDF 오버레이 (가장 위험, ~2~3일)

**기술 결정 필요**:
- (a) `tldraw 5.0.0` (이미 설치됨) — 풀스택 SDK, Safari Pencil 누락 버그 #5813 위험
- (b) `perfect-freehand` 직접 (리서치 권장) — 가벼움, 직접 구현, ~16~25ms latency

**좌표계 매핑**:
- PDF.js viewport scale ↔ 펜 캔버스 좌표 동기화
- `<canvas>` `desynchronized: true` (compositor 우회)
- `pointerrawupdate` + `getCoalescedEvents()` + `getPredictedEvents()` (Safari 폴리필)

**OCR 좌표 시스템 재설계**:
- 펜 stroke + PDF 좌표 페어로 backend 전송
- 기존 OCR 라우트(`/api/ocr`) 인터페이스 변경

**우회로 (펜슬 오버레이 못 풀면)**:
- Phase 1A의 박스 분리 유지
- 차별점 -1, 셀러블 가치 -

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
