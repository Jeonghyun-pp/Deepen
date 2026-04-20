# Deepen Agent 진화 실행 계획

> 현재 Deepen 에이전트를 Cursor 수준의 자율 에이전트(연구 그래프 도메인)로 끌어올리기 위한 실행 계획. 상위 로드맵은 `docs/agent-evolution-roadmap.md` 참조.

**작성일**: 2026-04-11
**대상 독자**: 구현자 본인, 리뷰어
**전제**: "Cursor 같다"는 코드 에디터가 되라는 뜻이 아니라, **에이전트 루프의 정교함**을 연구 그래프 도메인에 이식한다는 의미.

---

## 1. 목표

### 1.1 최종 목표 (North Star)

사용자가 한 줄의 고수준 지시를 내리면, 에이전트가 **수십 턴의 자율 루프**를 돌며 **그래프를 직접 조사·확장·정리**하고, 사용자는 **핵심 결정만 승인**하며, 결과는 **영속적**이다.

구체 시나리오 세 가지로 정의한다:

1. **"Transformer 이후 NLP 논문 50개 추가 조사해서 내 그래프에 붙여줘"**
   - OpenAlex 검색 → 필터 → PDF 본문 추출 → 개념 추출 → 기존 노드와 매칭 → 신규 노드/엣지 제안 → 사용자 승인 → DB 반영
   - 예상 30~50턴, 새로고침해도 진행 상태 유지

2. **"이 200개 논문에서 중복 개념 병합하고 클러스터 요약해줘"**
   - 전역 스캔 → 시맨틱 유사도 → merge 제안 → 개별 승인 → 클러스터별 summary 노드 생성
   - 부분 거부 시 모델이 이유를 받고 다시 판단

3. **"내가 지난주에 추가한 노드 중 뭐가 지금 연구 방향에 안 맞는지 말해줘"**
   - 최근 변경 이력 조회 → 현재 roadmap과 대조 → 리포트 (mutation 없음)
   - 대화 컨텍스트가 세션을 넘어 유지

### 1.2 중간 목표 (Why each phase exists)

목표를 달성하려면 현재 구조의 **세 가지 벽**을 차례로 무너뜨려야 한다:

| 벽 | 증상 | 깨는 Phase |
|---|---|---|
| **① 기억의 벽** | 새로고침하면 다 날아간다. `add_node`가 UI에만 반환된다 | Phase 0 |
| **② 사고 길이의 벽** | 5턴 제한 + 순차 실행 + 가드레일 없음 → 멀티스텝 불가 | Phase 1 |
| **③ 컨텍스트의 벽** | system prompt에 static 요약만. 1만 노드에서 무너진다 | Phase 2 |

Phase 3~6은 이 기반 위에서 **실용성과 신뢰**를 쌓는 작업이고, Phase 7~8은 **비용·확장**을 다루는 선택 단계다.

### 1.3 비목표 (Non-goals, 명시적 제외)

- **범용 코드 에디터**가 되지 않는다 — 연구 그래프 도메인에 집중
- **MCP 서버 생태계** 통합은 하지 않는다 — 가치 대비 비용 불일치
- **멀티 모달**(inline edit, composer UI)은 다루지 않는다
- **멀티 provider 라우팅**은 Phase 7에서만 선택적으로

---

## 2. 현재 상태 (감사 결과)

| 영역 | 현재 | 근거 |
|---|---|---|
| 루프 길이 | 5턴 고정 | `lib/agent/runner.ts:15` |
| 도구 실행 | 순차 | `lib/agent/runner.ts:117` |
| 가드레일 | 없음 | — |
| 도구 수 | 6개 | `lib/agent/tools/` |
| 컨텍스트 주입 | string.includes() 매칭 | `lib/agent/prompt.ts:42-86` |
| 승인 UI | batch 모두/거부 | `ApprovalCard.tsx` |
| DB | 없음 | package.json에 DB 의존성 없음 |
| 세션 저장 | in-memory Map | `lib/agent/approval.ts:10` |
| Mutation | 클라이언트 책임 | `runner.ts:141-149`, `add-node.ts:41-54` |
| LLM | OpenAI 단일 | `runner.ts:10` |
| Skill | system prompt 하드코딩 | `prompt.ts` |
| Feedback loop | 없음 | — |
| 체크포인트/undo | 없음 | — |
| Background | SSE만, Vercel 60s | — |

---

## 3. Phase별 실행 계획

각 Phase는 **목표 / 왜 / 작업 / 완료 기준 / 리스크** 5요소로 정의한다.

### Phase 0 — 영속성 기반

**목표**: 그래프·대화·승인 상태가 서버 DB에 영속된다. `add_node`/`add_edge`가 서버에서 직접 DB write를 수행한다.

**왜**: 영속성 없으면 다른 모든 Phase가 무의미하다. Phase 1(30턴 루프)은 실패 시 재개가 필요하고, Phase 6(undo)은 버전 기록이 필요하며, Phase 8(background)은 진행률 저장이 필요하다. 전부 DB 전제.

**작업**:
1. DB 선정 — **SQLite + Drizzle** 권장 (로컬 개발 빠름, 마이그레이션 간단). Postgres 전환 여지는 Drizzle이 열어둠.
2. 스키마 설계 — `nodes`, `edges`, `sessions`, `messages`, `tool_calls`, `approvals`, `graph_versions`(Phase 6 대비 빈 테이블만)
3. `lib/db/` 디렉터리 생성 + 마이그레이션 스크립트
4. 기존 `sample-data.ts`를 seed로 import
5. `add_node`/`add_edge` 도구를 서버 DB write로 전환 (`lib/agent/tools/add-node.ts:41`)
6. 클라이언트 `GraphShell` → DB fetch API (`/api/graph`)로 전환
7. `approval.ts` in-memory Map → DB `approvals` 테이블
8. 대화 히스토리 영속화 (`chat/route.ts`에서 append)

**완료 기준**:
- 새로고침해도 그래프·대화·진행 중 승인이 유지된다
- 서버 재시작 후에도 세션 재개 가능
- `add_node` 도구 실행 → DB write → 클라이언트가 fetch해서 반영 (클라이언트 mutation 경로 제거)

**리스크**:
- **최대 리스크**. 한 번 잘못된 스키마로 고정하면 Phase 1~8 전체가 끌려간다
- `GraphData` 타입이 앱 전반에 박혀있어 리팩토링 범위가 넓다
- 완화: 스키마를 `GraphNode`/`GraphEdge`와 1:1로 맞춰 시작, 최적화는 나중에

**기간**: 1주 (병목 없이 단독 진행)

---

### Phase 1 — 루프 강화

**목표**: 에이전트가 30턴 이상 자율 진행하며, Read 도구는 병렬 실행, 가드레일 3종으로 무한 루프·비용 폭주를 막는다.

**왜**: 최종 목표의 시나리오는 전부 멀티스텝이다. "50개 논문 조사"는 검색 1턴 + 논문별 조사 50턴 + 병합 판단 수 턴이 필요하다. 현재 5턴 고정은 시작도 못한다. 병렬 실행 없이 순차로 돌리면 50턴이 실제 사용 불가 수준으로 느리다.

**작업**:
1. `MAX_ITERATIONS` 5 → 30, env override 지원 (`runner.ts:15`)
2. 가드레일 3종:
   - **토큰 한도**: 세션 누적 input+output 토큰 상한 (default 200k)
   - **반복 탐지**: 동일 `(tool_name, args_hash)` 3회 이상 → 강제 종료
   - **비용 한도**: 세션당 USD 상한 (default $2)
3. Read 도구 병렬화 — `autoExec` 중 read-only는 `Promise.all`, write는 순차 (`runner.ts:117`)
4. `done` 도구 추가 — 모델이 명시적으로 완료 선언
5. 토큰/비용 추적 누적 (`openai.ts`의 usage → 세션 스토어)
6. 히스토리 압축 — 최신 3턴 외 tool result는 LLM 요약으로 대체 (`llmMessages`에 들어가는 tool content)

**완료 기준**:
- 30턴 이상 루프 검증: "Transformer 이후 NLP 논문 20개 조사" 시나리오가 완주
- 병렬 도구 호출 시 latency가 순차 대비 절반 이하
- 가드레일 3종 각각 unit test로 커버 (무한 루프·과비용 시나리오)

**리스크**:
- 히스토리 압축을 잘못하면 모델이 과거 결과를 "잊어" 다시 같은 도구 호출 (반복 탐지가 이걸 잡아야 함)
- 병렬화 시 tool 간 순서 의존(예: query → read_node)이 깨질 수 있음 → Read 병렬은 모델이 `tool_calls` 하나의 batch로 낸 것만 허용

**기간**: 1주 (Phase 0과 병행 가능)

---

### Phase 2 — Auto-context

**목표**: system prompt에 정적 요약을 박지 않는다. 모델이 `search_graph`/`read_node` 도구로 **필요할 때 가져온다**. 1만 노드 그래프에서도 컨텍스트가 폭증하지 않는다.

**왜**: 연구 그래프가 커지면 system prompt에 전체 요약을 넣는 방식은 파탄난다. 현재 `prompt.ts:42-86`의 `string.includes()` 매칭은 오탈자·동의어·다국어 전부 실패한다. Cursor가 codebase indexing으로 해결한 것과 같은 문제를 임베딩 + 시맨틱 검색으로 푼다. **이 Phase를 못 넘으면 Phase 3의 도구들도 무력하다** — 20개 도구가 있어도 검색을 못 하면 의미 없다.

**작업**:
1. 노드 임베딩 파이프라인
   - 모델: `text-embedding-3-small` (가격·성능 균형)
   - 대상: `label + tldr + content` concatenate
   - 저장: SQLite면 `sqlite-vec` 확장, Postgres면 `pgvector`
2. 신규 노드 생성 시 자동 embedding 큐 (Phase 0의 `add_node` 서버 경로에 후처리)
3. `search_graph(query, k, filters)` 도구 — 시맨틱 + 타입/연도 필터
4. `read_node(id)` 도구 — full content lazy fetch
5. `prompt.ts` 개조:
   - 유지: 전역 통계(노드/엣지 수, 타입별 분포), 최근 편집 노드 top 5
   - 제거: `string.includes()` 키워드 매칭 전체 (`:42-86`)
6. 도구 결과 페이지네이션 — `search_graph`가 한 번에 20개 초과 못 반환, `read_node`는 content 5k자 초과 시 truncation + continuation token

**완료 기준**:
- 1만 노드 그래프에서 첫 system prompt가 4k 토큰 이하
- "deep learning 관련 논문 중 attention 메커니즘 쓰는 것" 쿼리가 키워드 매칭 실패 케이스에서도 작동
- 신규 노드 추가 후 5초 이내 search_graph에 반영

**리스크**:
- 임베딩 인프라 추가가 예상보다 깊음 (벡터 인덱스, 재색인, 쿼리 튜닝)
- 임베딩 비용이 그래프 규모에 선형 → 초기 대량 임베딩 시 주의
- 완화: 초기에 sqlite-vec로 빠르게 시작, 1만 노드 이상 확인 후 pgvector 이전

**기간**: 1.5주 (실제 병목 구간)

---

### Phase 3 — 도구 생태계 확장

**목표**: 현재 6개 → 약 20개. Read/Write/Exec/Web 모든 축을 채운다. 최종 목표의 시나리오가 실제로 구현 가능해진다.

**왜**: Phase 2의 auto-context가 뼈대라면 Phase 3은 살이다. "논문 PDF 읽어서 개념 추출" 같은 기본 작업도 현재는 도구가 없어서 불가능. 도구는 **Cursor 패턴 — description 1~2줄로 짧게**, 복잡한 parameter는 모델이 역할 혼동하는 걸 유발한다.

**작업** — 7번 섹션(Tool 정의)에 개별 도구 엄밀 정의. 여기서는 목록만:

**신규 Write 도구** (승인 필요):
- `update_node`, `delete_node`, `merge_nodes`, `add_edge` (기존), `update_edge`, `delete_edge`, `write_note`

**신규 Read 도구** (자동):
- `read_node` (Phase 2), `search_graph` (Phase 2), `read_paper_pdf`, `web_fetch`, `web_search`, `read_note`, `list_recent_changes`, `get_graph_stats`

**신규 Exec 도구**:
- `summarize_cluster`, `find_gaps`, `run_projection`, `done` (Phase 1)

**완료 기준**:
- 최종 목표 시나리오 3개를 도구 조합만으로 표현 가능 (실제 실행 X, paper trace로 검증)
- 각 도구 description 2줄 이하
- 각 도구 JSON schema strict mode (`additionalProperties: false`)

**리스크**:
- 도구가 많아질수록 모델이 잘못 선택할 확률 증가 → naming과 description이 중요
- 완화: 도구명에 동사 prefix 일관성(`read_*`, `write_*`, `find_*`, `run_*`)

**기간**: 2주

---

### Phase 4 — 승인 입자도와 미리보기

**목표**: 사용자가 batch 안의 개별 항목을 toggle, diff 미리보기로 그래프에 어떻게 반영될지 확인, 거부된 항목은 모델에 피드백, 저위험 도구는 yolo 모드에서 자동 통과.

**왜**: Phase 3에서 도구가 20개로 늘면 "모두 승인/거부"는 사용 불가. 중간에 하나만 틀렸어도 전체 재시도는 비용 폭탄. 또 모델이 "왜 거부됐는지" 모르면 같은 제안을 반복한다 (Phase 1 반복 탐지가 걸리지만, 사용자가 피곤함). **승인 UX가 신뢰의 심장이다** — 이걸 못 세우면 사용자가 yolo 모드를 못 풀고, 그럼 Phase 1의 30턴 자율 루프도 실질적으로 5턴처럼 쓴다.

**작업**:
1. `ApprovalCard.tsx` 개별 체크박스 — 각 `ApprovalItem`마다 accept/reject toggle
2. Diff 미리보기 컴포넌트
   - `add_node`: 그래프 캔버스에 ghost 노드 표시 + 연결 예상 엣지
   - `update_node`: 전/후 필드 diff
   - `delete_node`/`merge_nodes`: 사라질 엣지 미리 표시
3. 부분 거부 피드백 — `runner.ts:134` `"rejected"` → `"rejected: 사용자가 X 항목은 승인 안 함. Y 이유 예상"` (이유는 ApprovalCard에서 사용자가 optional text로 입력)
4. Yolo 모드 토글 — 세션 setting에 `yoloDomains: ToolName[]`, whitelist된 도구는 `requiresApproval` 무시
5. Undo hook (Phase 6 완성과 연결) — 승인 후에도 10초간 undo 토스트

**완료 기준**:
- 5개 항목 batch에서 3개만 승인 → 2개는 rejected 메시지로 모델에 전달 → 모델이 대안 제시
- Diff 미리보기에서 실제 그래프와 동일하게 렌더링 (ghost 노드 스타일)
- Yolo 모드 whitelist에 `add_node` 넣었을 때 승인 건너뜀 확인

**리스크**:
- Diff 미리보기가 복잡도 폭발 위험 — `merge_nodes`는 시각화가 까다로움
- 완화: 우선 텍스트 diff부터, 그래프 ghost 렌더는 Phase 4 후반에

**기간**: 1주

---

### Phase 5 — Skill / Rules

**목표**: `lib/agent/skills/*.md` 파일 기반 skill 로더. `prompt.ts` 하드코딩 제거. 프로젝트별 `.deepenrc`로 사용자 룰 적용.

**왜**: system prompt가 길어지면 관리 불가능. Skill을 파일로 쪼개면 A/B 테스트·버전 관리·사용자별 override가 쉽다. 현재는 prompt를 바꿀 때마다 코드 수정 → 재배포. 자세한 근거는 `docs/skill-migration-research.md` 참조.

**작업**:
1. `lib/agent/skills/` 디렉터리 + 마크다운 frontmatter loader
2. 기본 skill 분할: `research-assistant.md`, `graph-curator.md`, `paper-reader.md`
3. `prompt.ts` → `loadSkills()` 호출로 대체, skill 본문을 concatenate
4. Anthropic 전환 시 (Phase 7) `cache_control: {type: "ephemeral"}`로 skill 블록 캐싱
5. `.deepenrc` 파일 포맷 정의 — 사용자 프로젝트 룰 (예: "내 분야는 NLP, generic ML 논문은 우선순위 낮음")
6. 세션 초기화 시 `.deepenrc` 읽어 skill에 prepend

**완료 기준**:
- `prompt.ts`에 하드코딩된 지시사항 0줄
- 신규 skill 파일 추가 → 재배포 없이 다음 요청부터 반영 (hot reload)
- `.deepenrc` 없는 프로젝트도 정상 작동

**리스크**:
- Skill이 너무 많아지면 선택 로직 필요 (현재는 전부 주입)
- 완화: Phase 5 범위에서는 전부 주입, skill routing은 Phase 7 이후 고려

**기간**: 1주 (Phase 0~1과 병행 가능)

---

### Phase 6 — Feedback Loop와 체크포인트

**목표**: 모든 mutation 후 자동 검증 → 문제 발견 시 모델에 재주입. 매 tool 호출마다 그래프 snapshot 저장. `undo` 도구 + 시간여행 UI.

**왜**: 자율 루프가 길어지면 실수가 누적된다. 사람이 모든 턴을 보지 않으므로 **자동 검증 + undo**가 없으면 그래프 오염이 불가역. Cursor가 lint/test 결과를 다음 턴에 주입하는 패턴 — 우리는 "orphan 노드 생김", "weight 이상치", "순환 생성" 같은 그래프 일관성을 쓴다.

**작업**:
1. 검증기 작성 — 각 mutation 후 실행
   - Orphan 노드 탐지 (엣지 0개, 고의 메모 제외)
   - Weight 이상치 (0~1 범위 외)
   - 순환 관계 (citation 타입에서 cycle)
   - Merge 후 중복 엣지
2. 검증 결과를 다음 LLM 턴에 tool result로 재주입 — `runner.ts` 루프에 hook
3. `graph_versions` 테이블 사용 (Phase 0 대비됨) — 매 tool 호출마다 diff 저장
4. `undo(steps)` 도구 — 최근 N step 되돌리기
5. 시간여행 UI — 버전 타임라인, 특정 시점 snapshot 보기
6. Phase 4의 undo 토스트와 연결

**완료 기준**:
- Orphan 노드 생성 시 모델이 다음 턴에 엣지 추가 제안
- undo 3회 → 3 step 전 정확히 복원 (clean-room 테스트)
- 타임라인에서 어느 tool 호출이 어떤 변경 만들었는지 조회 가능

**리스크**:
- 스냅샷 크기 급증 — 매 tool 마다 full snapshot은 비효율
- 완화: diff 기반(행 단위 insert/update/delete)만 저장, full snapshot은 100 step마다

**기간**: 1.5주

---

### Phase 7 — Apply 모델 분리 (선택)

**목표**: 계획 모델(Opus 4.6)과 실행 모델(Haiku 4.5) 분리. 토큰 비용 30~50% 절감.

**왜**: 실제 mutation(`add_node` 등)은 단순 JSON 생성이라 Opus가 오버킬. Cursor가 planner/apply model을 나눈 이유와 같다. **다만 Phase 6까지 작동하지 않으면 비용 최적화는 조기 최적화**. 필수 Phase 아님.

**작업**:
1. Anthropic client 도입 (SDK는 설치됨, `lib/clients/anthropic.ts` 생성)
2. `lib/clients/llm.ts`에 provider-agnostic 인터페이스 추가
3. Router 로직 — `if (tool.name in MUTATION_TOOLS) use Haiku`
4. Tool schema 변환기 — OpenAI function calling ↔ Anthropic tool use
5. Skill의 `cache_control` 적용 (Phase 5와 연결)
6. 토큰 비용 비교 대시보드 (`lib/db`의 `tool_calls` 누적)

**완료 기준**: 동일 시나리오에서 비용이 기존 대비 30% 이상 감소, 품질 저하 없음 (수동 검수 10케이스)

**리스크**: Provider 추상화가 기존 OpenAI 특화 코드(`llmMessages` 포맷 등) 리팩토링 유발

**기간**: 2주

---

### Phase 8 — Background Agent (선택)

**목표**: Vercel 60초 제한을 벗어나 장시간 작업(30분~수 시간)을 지원. Inngest 또는 Cloud Run worker 도입.

**왜**: "200개 논문 분석" 시나리오는 60초 안에 불가능. 하지만 Phase 0~6이 작동하면 60초 내 시나리오는 상당히 커버된다. **이 Phase는 진짜 무거운 워크로드 생겼을 때만 착수**.

**작업**:
1. Inngest 또는 Cloud Run worker 도입 결정
2. 장시간 작업 상태 DB 저장 (`background_jobs` 테이블)
3. 진행률 SSE/Realtime push
4. 클라이언트 UI — 진행 중 작업 목록, 취소 버튼
5. 작업 재개 — 중단 시 마지막 체크포인트부터

**완료 기준**: "100개 논문 분석 + 그래프 추가" 작업이 30분 내 완주, 중단 후 재시작 시 재개

**리스크**: 인프라 복잡도 급증, 모니터링·로깅 필요

**기간**: 2주

---

## 4. 90일 일정

```
Week 1    ┃ Phase 0 (DB)              + Phase 5 파일 구조 착수
Week 2    ┃ Phase 1 (30턴, 병렬, 가드레일) 완료
Week 3-4  ┃ Phase 2 (임베딩 + search_graph) ← 병목 구간
Week 5-6  ┃ Phase 3 (도구 6→20)
Week 7    ┃ Phase 4 (개별 승인 + diff)
Week 8    ┃ Phase 5 (skill 마이그레이션) 완료
Week 9-10 ┃ Phase 6 (feedback + 체크포인트)
────────────────────────────────────────
Week 11-12┃ Phase 7 / 8 (stretch goal)
```

**크리티컬 패스**: Phase 0 → 2 → 4 → 6. 이 라인이 미끄러지면 전체가 밀린다.
**병행 가능**: Phase 1·5는 Phase 0과, Phase 3은 Phase 2 후반부터.

---

## 5. 핵심 결정 사항

| 결정 | 선택 | 근거 |
|---|---|---|
| DB | SQLite + Drizzle (시작) | 로컬 개발 빠름, Postgres 이전 가능성 유지 |
| 벡터 저장 | sqlite-vec (시작) | DB와 동일 스택, 1만 노드까지 충분 |
| 임베딩 모델 | text-embedding-3-small | 가격·성능 균형, OpenAI 단일 스택 유지 |
| 기본 LLM | OpenAI gpt-4o (유지) | Phase 7까지 변경 없음 |
| Skill 포맷 | markdown + frontmatter | 버전 관리·diff 친화적 |
| Phase 7/8 | Stretch goal | Phase 6까지 안정화 후 재평가 |

---

## 6. 성공 지표

| 지표 | 현재 | Phase 6 완료 시 |
|---|---|---|
| 자율 루프 최대 길이 | 5턴 | 30턴 |
| 도구 수 | 6개 | 20개 |
| 1만 노드에서 첫 prompt 토큰 | N/A (불가) | <4k |
| 새로고침 후 상태 유지 | 불가 | 100% |
| Batch 내 부분 승인 | 불가 | 가능 |
| 3개 최종 시나리오 완주율 | 0/3 | 3/3 |
| Undo 가능 step | 0 | 100 step |

---

## 7. Tool 정의 (엄밀한 스펙)

### 7.1 공통 규칙

- **명명**: 동사 prefix. `read_*`, `write_*` 대신 구체 동작 — `query_graph`, `update_node`, `find_path`, `run_projection`
- **Description**: 1~2줄. 한국어 허용.
- **Parameters**: JSON schema, `additionalProperties: false`, 필수 필드 `required` 명시
- **requiresApproval**: Read/Exec는 `false`, Write(graph mutation)는 `true`
- **Return summary**: 한 줄, 결과 요약. LLM 히스토리 압축용
- **Return data**: 구조화된 결과, UI 렌더링용 (승인 카드 diff 미리보기 등)
- **Preview**: Write 도구는 필수, `"+ paper 노드 Transformer 추가"` 같은 한 줄 텍스트
- **에러**: throw 시 `runner.ts:150-158`이 `ok: false`로 래핑

### 7.2 카테고리 분류

| 카테고리 | 승인 | 모델 호출 비용 | 예시 |
|---|---|---|---|
| **Read** | 없음 | 낮음 | `query_graph`, `read_node`, `search_graph` |
| **Search** | 없음 | 중간 (외부 API) | `search_papers_openalex`, `web_search` |
| **Fetch** | 없음 | 중간 (네트워크) | `read_paper_pdf`, `web_fetch` |
| **Write-Graph** | 필수 | 낮음 | `add_node`, `update_node`, `delete_node`, `merge_nodes`, `add_edge`, `update_edge`, `delete_edge` |
| **Write-Doc** | 선택 | 낮음 | `write_note`, `read_note` |
| **Analyze** | 없음 | 높음 (LLM 자체) | `extract_concepts`, `summarize_cluster`, `find_gaps` |
| **Meta** | 없음 | 낮음 | `run_projection`, `list_recent_changes`, `get_graph_stats`, `undo`, `done` |

### 7.3 전체 Tool 스펙

아래는 **Phase 3 완료 시점의 최종 도구 세트**. 현 상태 vs 추가 여부 표시.

#### Read / Search

**`query_graph`** (기존)
- **Description**: 노드와 엣지를 ID/label/type/관계로 조회. 중심 노드가 있으면 1-hop 이웃도 반환.
- **Parameters**: `{ nodeId?, label?, type?, relationType?, depth? }`
- **Approval**: ❌
- **Return summary**: `"{label}: {N}개 이웃, {M}개 엣지"` 또는 `"전역 조회: {N}개 노드"`
- **상태**: 구현 완료 (`lib/agent/tools/query-graph.ts`)

**`search_graph`** (Phase 2 신규)
- **Description**: 시맨틱 임베딩 기반으로 그래프 노드 검색. 자연어 쿼리 + type/연도 필터.
- **Parameters**: `{ query: string, k?: number (default 10, max 20), filters?: { type?, yearFrom?, yearTo? } }`
- **Approval**: ❌
- **Return data**: `{ nodes: Array<{id, label, type, tldr, score}> }`
- **Return summary**: `"'{query}': {N}개 노드 (score ≥ 0.7)"`

**`read_node`** (Phase 2 신규)
- **Description**: 노드 ID로 전체 본문과 메타데이터를 lazy fetch. 큰 content는 truncation + continuation token.
- **Parameters**: `{ id: string, offset?: number, limit?: number (default 5000) }`
- **Approval**: ❌
- **Return data**: `{ node: GraphNode, truncated: boolean, nextOffset?: number }`
- **Return summary**: `"{label} ({type}): {N}자 본문"`

**`find_path`** (기존)
- **Description**: 두 노드 사이의 최단 경로. 학습 로드맵 생성에 사용.
- **Parameters**: `{ fromId: string, toId: string, maxDepth?: number (default 5) }`
- **Approval**: ❌
- **상태**: 구현 완료 (`lib/agent/tools/find-path.ts`)

**`list_recent_changes`** (Phase 3 신규)
- **Description**: 최근 N일 또는 최근 N개의 그래프 변경 이력 조회.
- **Parameters**: `{ since?: string (ISO date), limit?: number (default 20) }`
- **Approval**: ❌
- **Return data**: `{ changes: Array<{toolName, args, timestamp, versionId}> }`

**`get_graph_stats`** (Phase 3 신규)
- **Description**: 그래프 전역 통계 — 노드/엣지 수, 타입별 분포, 연결성, 고립 노드 수.
- **Parameters**: `{}`
- **Approval**: ❌

#### Search (외부)

**`search_papers_openalex`** (기존)
- **Description**: OpenAlex에서 논문 검색. 제목/저자/개념 쿼리 지원.
- **Parameters**: `{ query: string, filters?: {...}, perPage?: number }`
- **Approval**: ❌
- **상태**: 구현 완료

**`web_search`** (Phase 3 신규)
- **Description**: 일반 웹 검색 (OpenAlex 외 블로그/GitHub/뉴스 등).
- **Parameters**: `{ query: string, k?: number (default 5) }`
- **Approval**: ❌
- **주의**: OpenAlex로 해결되는 건 `search_papers_openalex` 우선

#### Fetch

**`read_paper_pdf`** (Phase 3 신규)
- **Description**: OpenAlex paper ID 또는 URL에서 PDF 본문 추출. 섹션별 텍스트 반환.
- **Parameters**: `{ paperId?: string, url?: string, sections?: ("abstract"|"intro"|"methods"|"results"|"conclusion")[] }`
- **Approval**: ❌ (Read-only 네트워크)
- **Return data**: `{ sections: Record<string, string>, totalChars: number }`

**`web_fetch`** (Phase 3 신규)
- **Description**: 일반 URL의 본문을 텍스트로 가져옴. HTML → markdown 변환.
- **Parameters**: `{ url: string, maxChars?: number (default 10000) }`
- **Approval**: ❌

#### Analyze

**`extract_concepts`** (기존)
- **Description**: 논문 노드에서 제안/사용된 개념을 LLM으로 추출.
- **Parameters**: `{ paperId: string, mode?: "proposed"|"used"|"both" }`
- **Approval**: ❌ (LLM 분석, mutation 아님)
- **상태**: 구현 완료

**`summarize_cluster`** (Phase 3 신규)
- **Description**: 노드 집합의 공통 테마를 요약. 신규 "summary" 노드 생성 후보 반환 (직접 mutation 안 함).
- **Parameters**: `{ nodeIds: string[] }`
- **Approval**: ❌ (분석만, 실제 추가는 `add_node`로)
- **Return data**: `{ theme: string, proposedNode: Partial<GraphNode> }`

**`find_gaps`** (Phase 3 신규)
- **Description**: 그래프에서 "질문은 있지만 답하는 논문이 없는" 공백을 탐지.
- **Parameters**: `{ scope?: "all"|"recent"|NodeId[] }`
- **Approval**: ❌
- **Return data**: `{ gaps: Array<{question: string, relatedNodeIds: string[]}> }`

#### Write — Graph

**`add_node`** (기존, Phase 0에서 서버 mutation으로 전환)
- **Description**: 새 노드를 그래프에 추가. 승인 필요.
- **Parameters**: `{ id?, label, type, content?, tldr?, meta? }`
- **Approval**: ✅
- **Preview**: `"+ {type} 노드 '{label}' 추가"`
- **상태**: 구현됨, Phase 0에서 DB write로 전환 필요

**`update_node`** (Phase 3 신규)
- **Description**: 기존 노드의 label/content/tldr/meta 수정.
- **Parameters**: `{ id: string, patch: Partial<GraphNode> }`
- **Approval**: ✅
- **Preview**: `"~ 노드 '{label}' 수정: {변경 필드 목록}"`

**`delete_node`** (Phase 3 신규)
- **Description**: 노드 삭제. 연결된 엣지도 함께 삭제 (cascade).
- **Parameters**: `{ id: string }`
- **Approval**: ✅
- **Preview**: `"- 노드 '{label}' 및 {N}개 엣지 삭제"`

**`merge_nodes`** (Phase 3 신규)
- **Description**: 두 노드를 하나로 병합. source의 엣지를 target으로 이동, source 삭제.
- **Parameters**: `{ sourceId: string, targetId: string, strategy?: "keep_target"|"merge_content" }`
- **Approval**: ✅
- **Preview**: `"⇄ '{sourceLabel}' → '{targetLabel}'로 병합 ({N}개 엣지 이동)"`

**`add_edge`** (기존, Phase 0에서 서버 mutation)
- **Description**: 두 노드 사이에 엣지를 추가.
- **Parameters**: `{ source: string, target: string, type: EdgeType, weight?, label?, note? }`
- **Approval**: ✅
- **상태**: 구현됨, Phase 0에서 DB write로 전환 필요

**`update_edge`** (Phase 3 신규)
- **Description**: 엣지의 type/weight/label/note 수정.
- **Parameters**: `{ id: string, patch: Partial<GraphEdge> }`
- **Approval**: ✅

**`delete_edge`** (Phase 3 신규)
- **Description**: 엣지 삭제.
- **Parameters**: `{ id: string }`
- **Approval**: ✅

#### Write — Doc / Note

**`write_note`** (Phase 3 신규)
- **Description**: 사용자 노트에 블록 추가. 기존 노트 또는 신규 생성.
- **Parameters**: `{ noteId?: string, title?: string, blocks: NoteBlock[] }`
- **Approval**: ✅ (noteId 없을 때만, 기존 노트 append는 자동 허용 고려)

**`read_note`** (Phase 3 신규)
- **Description**: 노트 ID로 본문 조회.
- **Parameters**: `{ noteId: string }`
- **Approval**: ❌

#### Meta

**`run_projection`** (Phase 3 신규)
- **Description**: 전체 그래프 re-projection 트리거. 레이아웃 재계산.
- **Parameters**: `{ scope?: "all"|"subgraph", rootId?: string }`
- **Approval**: ❌ (시각적 변경만, 데이터 mutation 없음)

**`undo`** (Phase 6 신규)
- **Description**: 최근 N개 tool 호출을 되돌림. Phase 6의 `graph_versions` 테이블 기반.
- **Parameters**: `{ steps?: number (default 1, max 50) }`
- **Approval**: ✅ (되돌리기 자체가 mutation)
- **Preview**: `"↶ 최근 {N}개 변경 되돌리기"`

**`done`** (Phase 1 신규)
- **Description**: 작업 완료 선언. 루프 종료. `reason` 필수.
- **Parameters**: `{ reason: string, summary?: string }`
- **Approval**: ❌
- **동작**: runner 루프가 이 도구 호출을 보면 즉시 `done` 이벤트 발행하고 종료

### 7.4 도구 선택 휴리스틱 (모델에 주입될 지침)

1. **조회는 먼저 `search_graph`** → 결과 부족 시 `query_graph`로 구조 조회
2. **본문이 필요할 때만 `read_node`** (unnecessary fetch 금지)
3. **외부 논문은 `search_papers_openalex` 우선**, 일반 웹은 `web_search`
4. **PDF 본문은 `read_paper_pdf`** (OpenAlex ID 있으면 그걸 사용)
5. **Mutation 전 검증**: `query_graph`로 중복 확인 → `add_node`
6. **Cluster 작업**: `search_graph` → `summarize_cluster` → (사용자 승인) → `add_node` + `add_edge`
7. **작업 종료**: 반드시 `done` 호출 (루프가 끊기지 않게)

### 7.5 요약 표

| 도구 | Phase | 카테고리 | 승인 |
|---|---|---|---|
| query_graph | 기존 | Read | ❌ |
| find_path | 기존 | Read | ❌ |
| extract_concepts | 기존 | Analyze | ❌ |
| search_papers_openalex | 기존 | Search | ❌ |
| add_node | 기존→0 | Write-Graph | ✅ |
| add_edge | 기존→0 | Write-Graph | ✅ |
| done | 1 | Meta | ❌ |
| search_graph | 2 | Read | ❌ |
| read_node | 2 | Read | ❌ |
| update_node | 3 | Write-Graph | ✅ |
| delete_node | 3 | Write-Graph | ✅ |
| merge_nodes | 3 | Write-Graph | ✅ |
| update_edge | 3 | Write-Graph | ✅ |
| delete_edge | 3 | Write-Graph | ✅ |
| read_paper_pdf | 3 | Fetch | ❌ |
| web_fetch | 3 | Fetch | ❌ |
| web_search | 3 | Search | ❌ |
| summarize_cluster | 3 | Analyze | ❌ |
| find_gaps | 3 | Analyze | ❌ |
| write_note | 3 | Write-Doc | ✅ |
| read_note | 3 | Write-Doc | ❌ |
| list_recent_changes | 3 | Meta | ❌ |
| get_graph_stats | 3 | Meta | ❌ |
| run_projection | 3 | Meta | ❌ |
| undo | 6 | Meta | ✅ |

**총 25개** (기존 6 + 신규 19). 로드맵의 "20+개" 목표를 충족.

---

## 8. 관련 문서

- `docs/agent-evolution-roadmap.md` — 상위 로드맵 (이 문서의 상위)
- `docs/agent-architecture.md` — 현재 에이전트 설계
- `docs/agent-architecture-review.md` — 설계 리뷰
- `docs/agent-implementation-guide.md` — 구현 가이드
- `docs/skill-migration-research.md` — Phase 5 상세 근거
