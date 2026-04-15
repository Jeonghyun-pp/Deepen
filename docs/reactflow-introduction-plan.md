# React Flow 기반 Whiteboard 뷰 도입 계획

작성일: 2026-04-15

## 배경

현재 Deepen 그래프는 reagraph 기반 2D/3D 뷰 2종. 멋있지만 실용성 부족 — 노드가 점으로만 표현되고 내용은 사이드 패널에서만 확인 가능. Heptabase 스타일의 **카드형 화이트보드**를 추가해 학습·정리 작업을 보완한다.

### 핵심 결정
- **reagraph 유지 + React Flow 추가** (교체 아님). 두 뷰는 상호보완.
  - reagraph: 탐색/발견, 거시, 휘발성 배치
  - whiteboard: 정리/이해, 미시, 영속 배치
- **라이브러리: `@xyflow/react` v12** (MIT, reagraph와 데이터 모델 호환, 연결 중심)
- **tldraw 탈락 이유**: 학습의 본질은 **연결**이므로 "그냥 거기 있다"가 1급인 화이트보드 SDK는 부적합
- **공통 store(Zustand)** 기반으로 두 뷰가 동일 데이터·선택·필터 공유

## 아키텍처

```
┌───────────────────────────────────────────────┐
│           공통 Zustand store                   │
│  nodes, edges, sections, selectedId,          │
│  roadmap, filter, whiteboardPositions         │
└──────────────┬────────────────────────────────┘
               │
   ┌───────────┴────────────┐
   │                        │
[Reagraph view]      [Whiteboard view]
 2D / 3D              React Flow
 위치 = 계산값        위치 = 저장값
 탐색·발견           정독·배치
```

### 데이터 모델 추가
```ts
interface GraphNode {
  // 기존 필드 ...
  whiteboardPos?: { x: number; y: number }
  whiteboardExpanded?: boolean
}

interface Section {
  id: string
  title: string
  color: string
  nodeIds: string[]
  bounds?: { x: number; y: number; w: number; h: number }
}
```

## 단계별 로드맵 (Phase 0 → 8)

| Phase | 작업 | 산출물 | 리스크 |
|---|---|---|---|
| **0** | Section 모델 + 공통 Zustand store 설계 | 타입·store 모듈 | 기존 hooks 리팩토링 범위 |
| **1** | reagraph를 공통 store에 이관 | 기능 동일, 데이터 경로만 교체 | 회귀 버그 |
| **2** | `@xyflow/react` 설치 + `/graph/whiteboard` 라우트 + 뷰 전환 탭 | 빈 화이트보드 MVP | 의존성 충돌 낮음 |
| **3** | CardNode custom node (제목+tldr, 펼침/접힘, 인라인 md) | 읽을 수 있는 카드 | md 렌더 성능 |
| **4** | 위치 영속화 (드래그 저장, localStorage) | whiteboardPos 저장·복원 | 초기 배치 품질 |
| **5** | Section(그룹 박스) 렌더링 — 양쪽 뷰 공통 | 색상 박스 + 제목 라벨 | reagraph overlay 정렬 |
| **6** | 뷰 간 context carry-over (우클릭 → 반대 뷰 포커스) | 끊김 없는 네비게이션 | 상태 전이 일관성 |
| **7** | 커스텀 엣지 + DAG 자동 정렬 버튼 (dagre/elk) | 선수관계 구조 시각화 | 사용자 배치 보존 UX |
| **8** | 에이전트 통합 (신규 노드 자동 배치·섹션 제안) | 기존 agent loop 재사용 | 배치 품질·튐 현상 |

## Phase별 상세

### Phase 0: 공통 store 설계
- 현재 `useGraphData.ts`의 상태를 Zustand로 이관
- 슬라이스: `graphSlice`(nodes/edges), `sectionSlice`, `selectionSlice`, `roadmapSlice`, `filterSlice`, `whiteboardSlice`
- reagraph·whiteboard 둘 다 `useStore(selector)`로 필요한 조각만 구독

### Phase 1: reagraph 이관
- `GraphCanvas.tsx`와 관련 hooks를 store 기반으로 교체
- **기능 변화 0** — 순수 리팩토링
- 회귀 테스트: 기존 2D/3D 샘플 데이터로 동작 확인

### Phase 2: Whiteboard MVP
- `app/graph/whiteboard/page.tsx` 생성
- 상단 탭: `2D | 3D | Whiteboard` (쿼리 파라미터 or 라우트)
- 초기 위치: force-directed 1회 계산 결과를 힌트로 사용 → whiteboardPos 미설정 노드에 대입
- 이 시점엔 기본 노드 모양(네모 박스 + 라벨)만

### Phase 3: CardNode
- React Flow `nodeTypes={{ card: CardNode }}`
- 접힘: 제목 + 타입 아이콘 + tldr 1줄
- 펼침: content md 인라인(기존 memo md 렌더러 재사용) + meta
- Handle 4방향(상하좌우)

### Phase 4: 위치 영속화
- `onNodeDragStop` → `setWhiteboardPos(id, pos)` → store + localStorage
- 초기 로드: `whiteboardPos ?? forceHint ?? fallbackGrid`
- "배치 초기화" 버튼 (사용자 전체 리셋)

### Phase 5: Section 박스
- **Whiteboard**: React Flow Group node (자식 노드 포함) 또는 배경 절대 위치 div (선택지 검토 필요)
- **Reagraph**: canvas 위 HTML overlay로 bounds 계산 후 색상 영역 그림
- Section CRUD UI는 우선 최소 (수동 생성/이름 변경)
- Roadmap → Section 매핑 고려 (Section이 상위 개념일 수 있음)

### Phase 6: Context carry-over
- 반대 뷰 열 때: 선택 노드 + 이웃 2hop 하이라이트 + 카메라 포커스
- URL 쿼리 `?focus=<nodeId>` 기반으로 공유 가능

### Phase 7: DAG 정렬
- 엣지 type: `prereq`(실선 화살표), `ref`(점선), `agent`(색상 구분)
- 버튼 "DAG 정렬": dagre로 `prereq` 엣지만 위→아래 재배치
- 덮어쓰기 확인 모달 (사용자 수동 배치 보호)

### Phase 8: 에이전트 통합
- 신규 노드의 whiteboardPos = 관련 노드 평균 위치 + 오프셋
- 섹션 자동 제안 (클러스터 감지 → 색상 박스 후보)

## 일정 감각
- Phase 0~2: **1주** (구조 구축)
- Phase 3~5: **1~2주** (Whiteboard 실사용 가능)
- Phase 6~8: **1~2주** (통합·완성도)
- 합계: **약 3~5주** (1인 기준, 병행 작업 없다고 가정)

## 검증 체크포인트
- **Phase 2 완료 시**: 뷰 전환 가능, 빈 화이트보드에서 노드 드래그 작동
- **Phase 4 완료 시**: 한 번 배치한 레이아웃이 새로고침 후에도 유지
- **Phase 5 완료 시**: 레퍼런스 이미지(Heptabase 템플릿 분석 화이트보드)와 비주얼 근접
- **Phase 7 완료 시**: 강의안 마스터리 시나리오 — 선수관계 DAG 한 번에 파악 가능

## 결정된 사항 (2026-04-15)

1. **Section 렌더 = React Flow Group node**
   - 박스 이동 시 안의 카드도 같이 이동 (부모-자식 관계)
   - 박스 리사이즈·드래그 기본 제공

2. **Roadmap > Section 계층** (Roadmap이 상위)
   ```ts
   interface Roadmap {
     id: string
     title: string
     sectionIds: string[]
     pathNodeIds?: string[]   // 읽는 순서
   }
   interface Section {
     id: string
     title: string
     color: string
     nodeIds: string[]
     roadmapId: string
     bounds?: { x, y, w, h }
   }
   ```
   - 예: "1강(Roadmap)" → [도입 Section, 본론 Section, 마무리 Section]

3. **모바일까지 편집 가능** (범위 확장)
   - Phase 3 CardNode부터 반응형 레이아웃 병행
   - 터치 제스처: 드래그 vs 핀치줌 구분 로직 필요
   - 카드 최소 터치 영역 44×44pt 확보
   - **Phase 일정에 +1주 예상**

4. **공유 링크(읽기 전용) 우선, 실시간 협업은 추후**
   - **백엔드 스택: Supabase 확정** (Postgres + Auth + Storage + Realtime + pgvector 통합 BaaS)
   - Free tier → Pro($25/월)로 스타트업 규모 커버. Postgres 표준이라 락인 위험 낮음
   - 최소 스펙: `POST /api/snapshots` → `{ id, url }`, `GET /api/snapshots/:id`
   - 스키마 초안:
     ```sql
     create table snapshots (
       id uuid primary key default gen_random_uuid(),
       data jsonb not null,         -- 전체 whiteboard 상태
       created_by uuid references auth.users(id),
       created_at timestamptz default now(),
       is_public boolean default true
     );
     ```
   - 실시간 편집(Yjs/Liveblocks)은 명시적으로 범위 밖. 단, Supabase Realtime으로 **나중에 확장 가능**
   - **Phase 9: 공유 링크 백엔드 + 읽기 전용 뷰**

## 업데이트된 Phase 로드맵

| Phase | 작업 | 변경사항 |
|---|---|---|
| 0~2 | 구조 구축 | 변경 없음 |
| 3 | CardNode | **모바일 반응형 병행 → +3~4일** |
| 4 | 위치 영속화 | 변경 없음 |
| 5 | Section 박스 | **React Flow Group node 확정** |
| 6 | 뷰 간 전환 | 변경 없음 |
| 7 | DAG 정렬 | 변경 없음 |
| 8 | 에이전트 통합 | 변경 없음 |
| **9 (신규)** | **공유 링크 백엔드 + 읽기 전용 뷰** | +1주 |

**수정 일정**: 약 **4~6주** (모바일 + 공유 링크 반영)
