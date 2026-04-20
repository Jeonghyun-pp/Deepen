# Cursor 수준 범용 에이전트로의 진화 로드맵

현재 Deepen chatbot agent를 Cursor 같은 자율적 범용 에이전트로 발전시키기 위한 구조 비교, 갭 분석, 단계별 로드맵.

작성일: 2026-04-11

전제: **"Cursor 같다"는 코드 에디터가 되라는 뜻이 아니라, 에이전트 루프의 정교함을 우리 도메인(연구 그래프)에 옮긴다는 의미.** 도구는 다르지만 아키텍처 패턴은 그대로 이식 가능.

---

## 1. 현재 Deepen Agent 구조 요약

| 영역 | 상태 |
|---|---|
| **루프** | ReAct, max 5 iteration, AsyncGenerator, `lib/agent/runner.ts:27-182` |
| **도구** | 6개 (query_graph, find_path, extract_concepts, search_papers_openalex, add_node, add_edge), `lib/agent/tools/` |
| **승인** | Read 자동, Write batch 승인 (개별 미지원) |
| **컨텍스트** | 그래프 통계 + 키워드 매칭(`string.includes`) + 1-hop 이웃 top-10 |
| **LLM** | OpenAI 단일, tool_calls 스트리밍 |
| **상태** | in-memory sessionId, 대화 히스토리는 tool 결과를 summary로 압축 |
| **영속성** | DB 없음. `add_node` 결과가 실제 그래프 mutation으로 반영되지 않음 (TODO) |

### 핵심 한계 3가지

1. **5턴 제한** — Cursor는 50+턴까지 자율 진행
2. **정적 컨텍스트** — 첫 system prompt에 박힌 그래프 요약만 사용, 작업 중 동적으로 더 가져오지 못함
3. **Mutation이 클라이언트 책임** — 서버가 그래프를 직접 못 바꿔서 자율성 낮음

---

## 2. Cursor의 아키텍처 패턴 (해체)

Cursor가 "거의 모든 걸 한다"고 느껴지는 이유는 단일 마법이 아니라 **8개 패턴의 조합**:

| # | 패턴 | 본질 | Deepen 매핑 |
|---|---|---|---|
| 1 | **긴 자율 루프** | 50+턴, stop condition은 모델이 판단 | 5턴 → ∞(가드레일 있는) |
| 2 | **풍부한 도구 세트** | 15~20개, read/edit/exec/search/web 망라 | 6개 → 20+개 |
| 3 | **Codebase 인덱싱** | 임베딩 기반 semantic search, lazy load | 그래프는 이미 있음 + 노드 임베딩 추가 |
| 4 | **Auto-context** | 모델이 어떤 파일이 필요한지 스스로 판단해 가져옴 | system prompt에 박는 대신 `read_node` 도구로 lazy load |
| 5 | **승인 입자도(granularity)** | hunk 단위 accept/reject, yolo 모드 | 노드/엣지 단위 개별 승인 |
| 6 | **Apply 모델 분리** | planner는 큰 모델, 적용은 작은 빠른 모델 | Opus가 계획, Haiku가 실제 그래프 mutation |
| 7 | **Feedback loop** | 편집 후 lint/에러를 다시 모델에 주입 | projection 후 그래프 일관성 검증 → 다시 모델에 |
| 8 | **체크포인트/되돌리기** | 어느 시점이든 undo | 그래프 스냅샷 + 시간여행 |

추가로 인프라 측면:

- **Background agent** (cloud sandbox에서 장시간 실행)
- **MCP 통합** (외부 도구 서버)
- **Rules/Memory** (`.cursorrules`, 프로젝트별 메모리)
- **Multi-modal** (chat / inline edit / composer)

---

## 3. 갭 매트릭스 — 현 상태 vs 목표

| 패턴 | 현재 | 목표 | 갭 크기 |
|---|---|---|---|
| 자율 루프 길이 | 5턴 | 50+턴, 가드레일 포함 | 中 (조정 + 안전장치) |
| 도구 수 | 6 | 20+ | 中 (점진 확장) |
| 인덱싱 | 키워드 string.includes | 노드 임베딩 + 벡터 검색 | 大 |
| Auto-context | system prompt에 박음 | lazy `read_node` 도구 | 中 |
| 승인 입자도 | batch 전체/거부 | 개별 + diff 미리보기 | 小 (UI 작업) |
| 모델 분리 | OpenAI 단일 | Opus(plan) + Haiku(apply) | 中 |
| Feedback loop | 없음 | projection → validate → 재주입 | 中 |
| 체크포인트 | 없음 | 그래프 버전 기록 | 中 |
| 영속성 | in-memory | DB (Postgres/SQLite) | 大 (전체 영향) |
| Mutation 권한 | 클라 책임 | 서버가 직접 mutation | 大 |
| Skill/Rules | system prompt 박음 | 파일 기반 skill | 小 |
| Background 실행 | Vercel 함수 60s | Cloud Run / Inngest | 中 (필요 시) |
| 멀티 provider | OpenAI only | Anthropic 추가 | 小 |

---

## 4. 단계별 진화 로드맵

### Phase 0 — 기반 정리 (1주)

**왜 필요**: 영속성 없이는 어떤 고급 기능도 작동 안 함.

- DB 도입 (Postgres + Drizzle, 또는 SQLite로 시작)
- 그래프 mutation을 서버 측으로 이동 — `add_node`/`add_edge`가 실제로 DB write
- 세션·대화 히스토리 영속화
- 마이그레이션: 현재 클라이언트 in-memory 그래프 → DB

**산출물**: 새로고침해도 그래프와 대화가 유지됨.

### Phase 1 — 루프 강화 (1주)

- `MAX_ITERATIONS` 5 → 30~50, **가드레일**: 토큰 누적 한도, 동일 도구 반복 탐지, 비용 한도
- 도구 호출 병렬화 (현재는 순차) — Cursor도 read 계열은 병렬
- Stop condition을 모델 판단에 맡김 (`done` 도구 추가)
- 대화 히스토리 압축: 오래된 tool result는 LLM 요약으로 대체

**산출물**: "이 논문 클러스터 정리해줘" 같은 멀티스텝 요청 가능.

### Phase 2 — Auto-context (1.5주)

**핵심 전환**: system prompt에 박는 대신 모델이 필요할 때 가져오게.

- `read_node(id)` — 노드 본문/메타 lazy fetch
- `search_graph(query, k)` — 임베딩 기반 시맨틱 검색 도구
- 노드 임베딩 파이프라인 (OpenAI text-embedding-3-small이면 충분)
- system prompt는 통계 + 최근 노드만 남기고 나머지는 도구로
- 페이지네이션: 도구가 너무 큰 결과를 못 뱉도록

**산출물**: 1만 노드 그래프에서도 컨텍스트 폭증 없음. Cursor의 codebase indexing 등가물.

### Phase 3 — 도구 생태계 확장 (2주)

20개 목표. 우선순위:

- `update_node`, `delete_node`, `merge_nodes`
- `read_paper_pdf` (PDF 본문 추출)
- `web_fetch`, `web_search` (이미 있는 OpenAlex 외)
- `summarize_cluster`, `find_gaps`
- `write_note`, `read_note` (사용자 노트)
- `run_projection` (전체 graph re-projection 트리거)
- `undo` (체크포인트 되돌리기)

**원칙**: read는 자동, write는 승인. 도구 description은 1~2줄로 짧게 (Cursor 패턴).

### Phase 4 — 승인 입자도 + 미리보기 (1주)

- 개별 toggle 승인 UI (이미 기획 있음, `ApprovalCard.tsx`)
- Diff 미리보기: "이 노드를 추가하면 그래프는 이렇게 바뀐다"
- 부분 승인 후 거부된 항목은 모델에 피드백 ("사용자가 X는 거부함, 다시 생각해")
- yolo 모드 토글 (낮은 위험 도구는 자동 통과)

### Phase 5 — Skill / Rules (1주)

`docs/skill-migration-research.md`에 정리한 내용 그대로:

- `lib/agent/skills/` 디렉터리 + 마크다운 skill
- system prompt에 cache_control로 주입
- 사용자별 `.deepenrc`로 프로젝트별 룰 (예: "내 분야는 NLP, generic ML 논문은 우선순위 낮음")

### Phase 6 — Feedback Loop & 체크포인트 (1.5주)

- Mutation 후 자동 검증: 그래프 일관성 체크 (orphan 노드, weight 이상치) → 결과를 모델에 재주입
- 그래프 스냅샷: 도구 호출마다 diff 저장
- `undo` 도구 + UI 시간여행

### Phase 7 — Apply 모델 분리 (선택, 2주)

- Opus 4.6: 계획 + 도구 호출 결정
- Haiku 4.5: 실제 mutation 실행 (낮은 비용)
- Router는 simple if/else로 시작
- 토큰 비용 30~50% 절감 기대

### Phase 8 — Background Agent (선택, 2주)

- Inngest 또는 Cloud Run 워커
- "이 200개 논문 다 분석해서 그래프에 추가" 같은 장시간 작업
- 진행 상황은 SSE/Realtime으로 push
- CrossBeam 패턴 그대로 (`docs/skill-migration-research.md` 참고)

---

## 5. 우선순위 — 현실적인 90일 플랜

```
Week 1     ┃ Phase 0  영속성 (DB, 서버 mutation)
Week 2     ┃ Phase 1  루프 강화 (30턴, 병렬, 가드레일)
Week 3-4   ┃ Phase 2  Auto-context (임베딩, search_graph)
Week 5-6   ┃ Phase 3  도구 확장 (10→20개)
Week 7     ┃ Phase 4  승인 입자도
Week 8     ┃ Phase 5  Skill 전환
Week 9-10  ┃ Phase 6  Feedback loop + 체크포인트
─────────────────────────────────────
Week 11-12 ┃ Phase 7/8 (필요 시): Apply 모델 분리, Background
```

**의도적으로 뺀 것**: MCP 통합, 멀티 모달리티(inline edit), 멀티 provider — 가치 대비 비용이 아직 안 맞음.

---

## 6. 가장 중요한 3가지 결정

1. **DB부터 가야 한다** — 영속성이 없으면 luxury 기능 다 헛것. 가장 따분하지만 가장 lock-in 큰 단계
2. **Auto-context가 진짜 문턱** — 이걸 못 넘으면 노드 1만 개에서 무너진다. Cursor와 우리의 가장 큰 격차도 여기
3. **승인 UX가 신뢰의 심장** — 도구가 20개로 늘면 batch 승인은 못 씀. 개별 + diff 미리보기 + undo가 세트로 와야 사용자가 yolo 모드 풀기 시작

---

## 7. 솔직한 평가

| 질문 | 답 |
|---|---|
| Cursor 수준 도달 가능? | **도메인 특화로는 가능.** 일반 코드 에디터를 만드는 게 아니므로 범위가 좁아 유리 |
| 가장 큰 리스크? | Phase 0 (DB 마이그레이션). 한 번 잘못 잡으면 두고두고 끌고 감 |
| 가장 과소평가되는 것? | Phase 4 승인 UX. 기능이 아니라고 미루기 쉬운데, 신뢰 무너지면 끝 |
| 12주 안에 어디까지? | Phase 0~6은 현실적, Phase 7~8은 stretch goal |
| Skill 전환은 언제? | Phase 5가 자연스럽지만 Phase 0~1과 병행 가능 (분리 작업) |

---

## 관련 문서

- `docs/agent-architecture.md` — 현재 에이전트 설계 문서
- `docs/agent-architecture-review.md` — 설계 리뷰
- `docs/agent-implementation-guide.md` — 구현 가이드
- `docs/skill-migration-research.md` — Skill 전환 + CrossBeam 분석
