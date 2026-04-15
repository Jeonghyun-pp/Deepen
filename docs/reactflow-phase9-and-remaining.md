# Phase 9 전 정리 + Phase 9 작업 문서

작성일: 2026-04-15
관련 문서: `reactflow-introduction-plan.md` (전체 로드맵)

---

## Part 1. Phase 9 전에 해야 할 일 (Pre-P9 Backlog)

Phase 0~8 구현은 완료됐지만, 실사용·배포 전에 정리할 **잔여 작업과 알려진 한계**가 있다. Phase 9(공유 링크 + Supabase) 들어가기 전에 이들을 먼저 처리하는 게 좋다 — 특히 데이터 모델 관련 부채는 백엔드 스키마에 직접 영향을 주기 때문.

### A. 데이터 모델 정합성

| # | 항목 | 현황 | 해야 할 일 |
|---|---|---|---|
| A1 | `Section.roadmapId` | Phase 5에서 모든 섹션이 `"default"`로 들어감 | Roadmap 선택/생성 UI를 섹션 생성 플로우에 추가. 또는 `Roadmap.sectionIds` 역참조 동기화 |
| A2 | `Roadmap.sectionIds` 동기화 | Section에서 `roadmapId`는 저장되지만 Roadmap 쪽에서 `sectionIds` 배열은 업데이트 안 됨 | `addSection`/`removeSection`에서 Roadmap도 같이 업데이트 (또는 view time에 derive) |
| A3 | `whiteboardPos` 필드 | 타입에만 추가됨. 실제 저장은 `whiteboardStore.positions`(Record)에 별도 | 택1: (a) GraphNode 내부에 통합 (b) 현재처럼 분리 유지 — Supabase 스키마 설계 시 결정 |
| A4 | `Section.nodeIds` 정합성 | 섹션 삭제 시 카드의 `sectionId` 필드는 자동 해제 안 됨 (타입엔 있지만 whiteboardStore는 Section 내부 nodeIds만 관리) | `GraphNode.sectionId`를 제거하거나, 양방향 동기화 추가. 단일 소스 권장 (현재는 Section.nodeIds만 사용 중) |

### B. 뷰 간 동기화 미비

| # | 항목 | 현황 | 해야 할 일 |
|---|---|---|---|
| B1 | Reagraph에 섹션 오버레이 | Phase 5에서 "Whiteboard 주 가치" 이유로 생략됨 | Canvas 위 HTML overlay로 섹션 bounds를 색 영역으로 표시. 로드맵 활성화 시 섹션 강조 |
| B2 | 우클릭 "반대 뷰에서 보기" | Phase 6는 자동 포커스만 구현 | Reagraph 노드 우클릭 → "Whiteboard에서 펼쳐 보기" 메뉴. Whiteboard 카드 우클릭 → "그래프에서 위치 보기" |
| B3 | Section 상태 Reagraph 반영 | Reagraph는 Section 개념 자체를 모름 | B1과 연동. 최소한 Roadmap overlay에서 Section별 구간 표시 |

### C. Whiteboard UX 미완

| # | 항목 | 현황 | 해야 할 일 |
|---|---|---|---|
| C1 | 섹션 멤버 드래그 추가 | 현재는 카드의 📁+ 드롭다운으로만 추가 | 카드를 섹션 박스 위로 드래그 → 자동 편입. React Flow `onNodeDragStop`에서 bounds 충돌 판정 |
| C2 | 섹션 리사이즈 | bounds는 저장되지만 UI 핸들 없음 | `NodeResizer` 컴포넌트 추가 |
| C3 | 섹션 색상 변경 | 생성 시 자동 순환만 | 섹션 헤더에 색상 선택 팝오버 |
| C4 | 카드 메모 추가/수정 | Phase 3는 content 읽기만 지원 | 펼친 카드 하단에 인라인 메모 에디터. FloatingMemo 코드 재사용 |
| C5 | 엣지 생성 (사용자 직접) | Handle은 있지만 연결 UI 미구현 | `onConnect` 핸들러로 graphStore.addEdge 호출 + 타입 선택 팝오버 |
| C6 | 엣지 삭제/수정 | 읽기만 | 엣지 클릭 → 라벨 편집 / 삭제 버튼 |
| C7 | 모바일 반응형 | 초기 결정은 "모바일까지 편집 가능"이었으나 미구현 | 터치 제스처(드래그 vs 핀치줌), 카드 최소 44×44pt, 반응형 툴바 |

### D. 성능·안정성

| # | 항목 | 현황 | 해야 할 일 |
|---|---|---|---|
| D1 | 대규모 그래프 | 현재 샘플은 수십 노드. 500+ 환경 미검증 | 가상화, 레이블 LOD, 엣지 간소화 옵션 |
| D2 | 에이전트 증분 배치 충돌 | `findAnchorPosition`이 이웃 오른쪽 280px 오프셋 — 여러 개 동시 추가 시 겹침 가능 | 기존 카드들과 충돌 검사 + 자리 탐색 |
| D3 | store HMR 안전성 | `initData`는 비어있을 때만 초기화하지만 HMR 경계 테스트 부족 | Next.js dev HMR에서 검증 |
| D4 | localStorage 크기 한계 | positions/expanded/sections 모두 localStorage에 지속 — 500 노드 × 위치 = 수십 KB, OK | 1000+ 노드에서 모니터링 |

### E. 에이전트 통합 확장

| # | 항목 | 현황 | 해야 할 일 |
|---|---|---|---|
| E1 | 섹션 자동 제안 | Phase 8 범위 밖으로 밀림 | 클러스터 감지(Louvain/k-means on positions) → "이 묶음을 섹션으로?" 제안 |
| E2 | 에이전트가 섹션 직접 생성 | 툴 없음 | `createSection`, `assignNodeToSection` 툴 추가. 에이전트가 Roadmap 생성 시 섹션도 제안 |
| E3 | 에이전트가 카드 펼치기 | 없음 | "이 카드 내용을 보여줘" 같은 요청 시 `setExpanded` 호출 |

### F. 작은 빌드·배포 이슈

- `package-lock.json` 3개 존재 (C:\Users\pjhic, deepy-prototype 상위, 현재 프로젝트). Next.js가 turbopack root 경고 출력 — `next.config.*`에 `turbopack.root` 명시하거나 불필요한 lockfile 제거

---

## Part 2. Phase 9: 공유 링크 백엔드 + 읽기 전용 뷰

### 목표
**"내가 만든 Whiteboard 상태를 URL로 공유해서, 다른 사람이 읽기 전용으로 볼 수 있다."**

실시간 협업(Yjs/Liveblocks)은 명시적으로 범위 밖. 단, Supabase Realtime으로 **추후 확장 가능한 구조**로 설계.

### 스택 (확정)
- **Supabase** — Postgres + Auth + Storage + Realtime + pgvector 통합 BaaS
- Free tier로 시작 → Pro($25/월)로 스케일
- Next.js App Router의 Server Actions/Route Handlers로 API 계층

### 범위
- 인증 없이 익명으로 스냅샷 생성 가능 (MVP). 나중에 Auth 붙이면 내 스냅샷 관리 UI
- 스냅샷 = 그 시점의 전체 Whiteboard 상태 (nodes, edges, positions, expanded, sections, roadmaps)
- 원본을 수정해도 기존 공유 링크는 **불변** (스냅샷 방식)
- 공유 받는 사람은 편집 불가, 뷰포트 조작(zoom/pan)만 가능

### 데이터 모델

```sql
-- Supabase Postgres
create extension if not exists pgcrypto;

create table snapshots (
  id uuid primary key default gen_random_uuid(),
  -- 공유 URL 친화적인 짧은 slug (예: abc12345)
  slug text unique not null default encode(gen_random_bytes(4), 'hex'),

  -- 스냅샷 본문 (전체 whiteboard 상태)
  data jsonb not null,

  -- 메타
  title text,
  created_by uuid references auth.users(id),  -- 익명 허용 (nullable)
  created_at timestamptz not null default now(),
  view_count integer not null default 0,

  -- 공개 범위
  is_public boolean not null default true,
  expires_at timestamptz  -- null이면 영구
);

create index on snapshots(slug);
create index on snapshots(created_by);

-- RLS
alter table snapshots enable row level security;

-- 공개 스냅샷은 누구나 읽기 (view_count 증가용 update도 별도 정책)
create policy "public_read" on snapshots
  for select using (is_public = true and (expires_at is null or expires_at > now()));

-- 작성자 본인만 수정/삭제 (익명 생성은 서비스 키로 처리)
create policy "owner_write" on snapshots
  for all using (auth.uid() = created_by);
```

### 스냅샷 JSON 스키마 (`data` 필드)

```ts
type SnapshotPayload = {
  version: 1;
  createdAt: string;
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  whiteboard: {
    positions: Record<string, { x: number; y: number }>;
    expanded: Record<string, boolean>;
    sections: Section[];
  };
  roadmaps: Roadmap[];
  // 선택 사항: 공유 시점의 뷰포트 상태
  viewport?: { x: number; y: number; zoom: number };
  focus?: { nodeId?: string };
};
```

### API

| Method | Path | Body | Response | 동작 |
|---|---|---|---|---|
| POST | `/api/snapshots` | `SnapshotPayload` + optional `title` | `{ slug, url }` | 현재 store 상태를 저장, 슬러그 발급 |
| GET | `/api/snapshots/[slug]` | — | `{ id, slug, title, data, createdAt, viewCount }` | 공개 스냅샷 조회 + view_count++ |
| DELETE | `/api/snapshots/[slug]` | — | `{ ok }` | 작성자만 (Auth 단계에서 활성화) |

### 프런트엔드 변경

1. **"공유" 버튼** (Whiteboard 툴바 우상단)
   - 클릭 → `createSnapshot()` → 서버에 POST
   - 응답받은 URL을 클립보드 복사 + 토스트

2. **읽기 전용 라우트** `/share/[slug]`
   - GET `/api/snapshots/[slug]` → 전체 payload 받음
   - `WhiteboardCanvas`를 readOnly 프롭으로 렌더
     - `nodesDraggable={false}`, `nodesConnectable={false}`, `elementsSelectable={true}`
     - 툴바(섹션 추가/DAG 정렬/배치 초기화) 숨김
     - 상단 배너: "{title} · {createdAt} · 읽기 전용"
   - 로컬 store를 **격리** — 원본 Whiteboard store를 오염시키지 않도록 별도 scope 또는 독립 컴포넌트에 props 주입

3. **store 리팩토링 (필요 시)**
   - 현재 `useGraphStore`/`useWhiteboardStore`는 singleton — 읽기 전용 뷰가 별도 데이터 사용하려면:
     - 방안 A: Zustand vanilla store + React Context로 주입 (스냅샷 뷰에 별도 store 인스턴스)
     - 방안 B: 공유 뷰 전용 props-based 렌더링 (store 안 씀)
     - 추천: 방안 B — 공유 뷰는 읽기만 하므로 store 없이 props로 충분

### 의존성 & 환경변수

```bash
npm install @supabase/supabase-js
```

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # 서버 라우트 전용
```

### 작업 순서

1. **Supabase 프로젝트 생성** + 스키마/RLS 적용 (대시보드 or migration 파일)
2. `lib/supabase/{client,server}.ts` — 클라이언트/서버용 Supabase 인스턴스
3. `app/api/snapshots/route.ts` (POST) + `[slug]/route.ts` (GET)
4. `lib/snapshot.ts` — store 상태 ↔ `SnapshotPayload` 직렬화/역직렬화
5. Whiteboard 툴바에 공유 버튼 추가
6. `app/share/[slug]/page.tsx` + `ShareShell` + 읽기 전용 모드 `WhiteboardCanvas`
7. 배너/토스트 UI
8. 배포 시 환경변수 검증 (Vercel)
9. 에지 케이스: 만료/비공개/없는 슬러그 → 404 페이지

### 검증 체크포인트

- [ ] 익명 사용자가 공유 버튼 누름 → URL 발급
- [ ] 다른 브라우저/시크릿 탭에서 URL 열기 → 동일한 배치·섹션·카드 내용이 재현됨
- [ ] 읽기 전용 뷰에서 카드 드래그 시도 → 반응 없음
- [ ] 원본 Whiteboard에서 카드 이동 → 기존 공유 링크는 스냅샷 당시 상태 유지
- [ ] 없는 slug 접근 → 404

### 향후 확장 (Phase 9 범위 밖)

- 인증 추가: 로그인하면 "내 스냅샷 목록", 삭제/제목 변경
- Realtime 편집 (Supabase Realtime + Yjs adapter)
- 스냅샷 diff ("이 스냅샷과 현재 Whiteboard 차이점")
- Fork: 공유받은 스냅샷을 내 Whiteboard로 복사
- 액세스 로그, 만료 설정 UI

---

## 우선순위 제안

**Phase 9 들어가기 전 필수** (데이터 스키마에 영향):
- A3 (`whiteboardPos` 저장 위치 결정)
- A1, A2 (Roadmap/Section 관계 정리)
- A4 (Section.nodeIds vs GraphNode.sectionId 중 단일 소스 확정)

**Phase 9 함께 / 그 후**:
- 나머지 B/C/D/E/F 항목은 Phase 9와 독립. 사용자 피드백 받으면서 우선순위 재조정
