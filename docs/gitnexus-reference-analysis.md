# GitNexus 레퍼런스 분석 및 Deepy 적용 방안

> 작성일: 2026-04-14
> 레퍼런스: https://github.com/abhigyanpatwari/GitNexus
> 목적: GitNexus의 핵심 아이디어를 Deepy 그래프 시스템에 이식할 수 있는지 검토하고, 활용 가능한 모든 요소를 정리

---

## 1. GitNexus는 무엇인가

### 한 줄 정의
> **"AI 에이전트 컨텍스트를 위한 신경계(nervous system for agent context)."**
> 코드베이스를 인덱싱 시점에 구조 분석까지 끝낸 지식 그래프로 변환해, LLM 에이전트(Claude Code / Cursor / Codex)에 MCP 도구로 제공.

### 차별점 — "Precomputed Relational Intelligence"
기존 Graph RAG는 LLM이 반복 쿼리로 그래프를 탐색한다.
→ caller 찾기 → 파일 식별 → 테스트 필터 → 위험도 평가 … 매 턴 컨텍스트 누락 위험.

GitNexus는 **인덱싱 시점에** 다음을 미리 계산해둔다.
- 의존성 클러스터 (Leiden 알고리즘)
- 실행 흐름(process) 트레이싱
- 엣지별 confidence score
- 영향 depth 그룹

→ 에이전트는 도구를 **1회** 호출하면 "완전히 구조화된 응답"을 받는다.
→ 작은 모델로도 큰 모델급 신뢰성. LLM이 컨텍스트를 놓칠 수 없음.

### 아키텍처 2-트랙

| 트랙 | 용도 | 스택 | 제약 |
|---|---|---|---|
| **CLI + MCP** (메인) | 로컬 인덱싱 → MCP 서버로 에이전트 노출 | Tree-sitter native + LadybugDB | 없음 |
| **Web UI** | 브라우저 ZIP/GitHub 업로드 → 시각 탐색 | Tree-sitter WASM + LadybugDB WASM | ~5k 파일 |

`~/.gitnexus/registry.json`에 인덱스를 전역 등록 → **MCP 서버 하나가 여러 레포 서빙**.

### 인덱싱 6단계 파이프라인

1. **Structure** — 폴더/파일 계층 매핑
2. **Parsing** — Tree-sitter AST로 심볼 추출
3. **Resolution** — import/call/inheritance 파일 간 연결 + 타입 추론
4. **Clustering** — Leiden 알고리즘으로 기능적 커뮤니티 탐지
5. **Processes** — entry point부터 실행 흐름 트레이싱
6. **Search** — 임베딩 생성

### MCP 도구 16개 (핵심)

**단일 레포용 (11)**
- `query` — BM25 + semantic + RRF 하이브리드 검색, process 단위 그룹화
- `context` — 심볼의 360도 뷰 (refs, process 참여)
- `impact` — **Blast radius** 분석 + depth grouping + confidence
- `detect_changes` — git diff → 영향받는 process 매핑
- `rename` — 그래프+텍스트 기반 다파일 일괄 리네임
- `cypher` — 로우 Cypher 쿼리
- `list_repos` 등

**멀티 레포 그룹용 (5)**
- `group_sync` — 레포 간 contract(API 시그니처) 추출·매칭
- `group_query` — 레포 걸친 실행 흐름 검색
- `group_contracts` / `group_status` / `group_list`

### Agent Skills
`.claude/skills/`에 자동 설치되는 4개 기본 스킬:
- **Exploring** (낯선 코드 탐색)
- **Debugging** (콜 체인 추적)
- **Impact Analysis** (변경 전 영향 평가)
- **Refactoring** (안전한 리팩터 계획)

`analyze --skills` 실행 시 Leiden 클러스터별로 `SKILL.md` 자동 생성 → 에이전트는 작업 영역의 타겟 컨텍스트만 수령.

### 그래프 스키마
- **Nodes**: File, Folder, Function, Class, Interface, Variable
- **Edges**: Imports, Calls, Inheritance, References, Membership
- **Metadata**: 타입 시그니처, confidence score, cross-refs

---

## 2. Deepy에 적용 전 관점 정리

### 도메인 차이
| | GitNexus | Deepy |
|---|---|---|
| 입력 | 코드 레포 | 강의안(PDF/슬라이드/MD) |
| 파서 | Tree-sitter AST | LLM 기반 개념 추출 |
| 노드 | 코드 심볼 | 개념/용어 |
| 엣지 | Imports/Calls/Inheritance | 선수관계/유사/반례 |
| 사용자 | 개발자 + AI 에이전트 | 학습자 + AI 튜터 |

### 결정적 공통점
둘 다 **"LLM이 그래프를 탐색하게 하지 말고, 정돈된 컨텍스트를 주라"** 는 문제를 푼다.
→ Deepy의 agent tool loop(현재 LLM이 그래프 걷기)에 **그대로 적용 가능**.

### MCP는 껍데기
Deepy는 MCP 서버를 쓰지 않는다. 하지만 **MCP = 단순 배달부**이며, 진짜 자산은 아래 파이프라인 철학이다. 내부 function calling 스키마로 그대로 이식 가능.

---

## 3. 활용 가능 요소 전수 목록

### A. 인덱싱 파이프라인
- **A1. 6단계 파이프라인 구조 차용** — Structure → Parsing → Resolution → Clustering → Processes → Search
- **A2. 선계산 레이어 신설** — 노드 생성 후 ancestors/descendants/confidence/embedding을 DB에 박아둠
- **A3. Auto-reindex** — 강의안 교체/추가 시 델타 인덱싱
- **A4. Diff 기반 영향 매핑** — v1 → v2 업로드 시 변경 영향 노드 표시

### B. 그래프 알고리즘
- **B1. Blast radius / descendants 선계산** — "이 개념 흔들리면 무너지는 것들"
- **B2. Ancestors / 선수개념 체인** — Roadmap 학습 순서 자동 생성
- **B3. Depth grouping** — 1-hop, 2-hop… 단위 시각화
- **B4. Confidence scoring** — LLM 추출 엣지의 신뢰도(0~1). 시각 hierarchy + 필터링 + 재확인 큐
- **B5. Leiden community detection** (주의) — 시각이 아닌 **검색 라우팅 메타데이터용**. 과거 클러스터링 제거 이력 존중
- **B6. Execution flow = 학습 경로 자동 추출** — 진입 개념 → 목표 개념 경로
- **B7. Cross-reference 해소** — 동의어 병합("SGD"="확률적 경사하강법")

### C. 검색 / 컨텍스트 제공
- **C1. Hybrid search (BM25 + semantic + RRF)** — RightPanel 검색 + agent tool 공용
- **C2. 360도 Node context** — 1 쿼리로 {정의·선수·의존자·관련·출처·이해상태} 일괄 반환
- **C3. Process-grouped 결과** — 검색 결과를 학습 흐름 단위로 묶음
- **C4. Categorized references** — 정의/사용/예시/반례 분류

### D. 에이전트 통합 패턴
- **D1. Function calling 스키마로 tool 설계** — GitNexus 16툴 네이밍·역할분담 벤치마크
- **D2. "Precomputed → single call" 철학** — agent loop이 그래프 걷지 않음
- **D3. Skill 자동 생성** — 클러스터별 "학습 가이드"를 시스템 프롬프트로 선주입
- **D4. 4대 스킬 매핑**
  - Exploring → 낯선 강의안 개관
  - Debugging → 어디서 막혔는지 추적
  - Impact Analysis → 복습 범위 추천
  - Refactoring → 학습 순서 재편

### E. UI / 시각화
- **E1. 인터랙티브 그래프 explorer** (이미 보유)
- **E2. Blast radius 시각 오버레이** — 노드 클릭 시 descendants를 Roadmap에 하이라이트
- **E3. Confidence 기반 엣지 스타일링** — 신뢰도 낮은 엣지는 점선/흐릿 (현 시각 hierarchy 확장)
- **E4. Impact depth 색상 그라디언트** — 1-hop 진한 빨강, 3-hop 연노랑

### F. 멀티 도큐먼트 (Group)
- **F1. 강의 그룹 / 과목 묶음** — 여러 강의안을 "과목"으로 묶어 교차 분석
- **F2. Contract → 용어 계약** — 강의 간 공통 용어/정의 일관성 매핑
- **F3. Cross-lecture 실행 흐름** — "선형대수 → 확률론 → ML" 선수 과목 그래프
- **F4. Staleness 추적** — 원본 업데이트 vs 그래프 상태

### G. 쿼리 인터페이스 (후순위)
- **G1. Cypher-like 쿼리** — 고급 사용자용. 과함
- **G2. 스키마 자기서술** — LLM이 직접 쿼리 생성

### H. 저장 / 인프라
- **H1. 전역 레지스트리** — `~/.deepy/registry.json`
- **H2. Lazy connection pooling** — 대규모 그래프 시 참고
- **H3. 로컬 인덱스 캐시** — 재파싱 비용 큰 경우

### I. 부가 기능
- **I1. Lecture Wiki 자동 생성** — 그래프 기반 강의 개요 합성
- **I2. 노트 review** — 사용자 노트 vs 그래프 대조 → 누락 선수, 오인과 피드백
- **I3. 커스텀 도메인 용어집**

---

## 4. 우선순위 및 로드맵 제안

### 🔥 즉시 착수 (레버리지 상 / 난이도 중) — "GitNexus 핵심 가치 재현"
**A2 + B1 + B2 + B4 + C1 + C2 + D2 + E2**
→ **선계산 레이어 + blast radius + hybrid search + 360 context** 한 묶음
→ 이것만으로 agent tool loop의 토큰·레이턴시 크게 감소, 컨텍스트 누락 방지

**특히 Deepy의 DAG 3원칙(완결성·의존성·이해확인)과 정합**:
- B1 descendants → "이해확인" 원칙 구현
- B2 ancestors → "의존성" 원칙 자동화
- C2 360 context → "완결성" 원칙 (한 노드의 모든 맥락 일괄 제공)

### 🟡 중기
**A4, B3, B6, D1, D3, E3, F2**
→ diff 업데이트, 학습 경로, 용어 일관성

### ⚪ 후순위 / 스킵
**B5(시각용), G1, H1~H2, F4**
→ 도메인 불일치 또는 규모 전 과투자

---

## 5. 핵심 원칙 변화 (TL;DR)

> **Before**: 에이전트가 그래프를 탐색한다 (매 턴 쿼리, 맥락 누락 위험)
> **After**: 그래프가 이미 정돈된 답을 준다 (1회 호출, 완전한 컨텍스트)

MCP냐 내부 함수냐는 껍데기. 본질은 **"인덱싱 시점 선계산 → 에이전트는 소비만"** 이라는 아키텍처 전환.

UI(RightPanel)와 agent loop이 **같은 선계산 결과를 공유**하므로 "화면에 보이는 컨텍스트 = 에이전트가 보는 컨텍스트"가 자연스럽게 일치하는 부수 효과도 크다.

---

## 6. 운영 설계 — 재인덱싱 전략

선계산 모델은 "쓸 때 빠르려면 넣을 때 고생해라"는 베팅이다. 그 대가는 **재인덱싱 복잡도**에 집중된다. 새 정보가 추가되거나 기존 정보가 수정될 때 어디까지 다시 계산할지 규칙이 없으면, 전체 재빌드로 회귀하거나 stale 상태를 방치하게 된다.

### 6.1 재인덱싱 3가지 전략 비교

| 전략 | 설명 | 장점 | 단점 | 적합 |
|---|---|---|---|---|
| **(a) Full rebuild** | 추가 시 전체 처음부터 | 단순, 일관성 보장 | 느림, LLM 비용 재지불 | 초기 MVP |
| **(b) 델타 인덱싱** | 추가분만 파싱 + 영향 선계산만 갱신 | 빠름, 비용 최소 | 경계 설정 까다로움 | 운영 단계 |
| **(c) Lazy 재계산** | 추가는 즉시, 선계산은 쿼리 시점 | 추가 즉시 반영 | 첫 쿼리 느림, 캐시 무효화 복잡 | 드물게 쓰이는 항목 |

**권장: b + c 하이브리드.**
기본 그래프와 자주 조회되는 선계산은 즉시(델타), 전역 계산은 배치 또는 lazy.

### 6.2 선계산 항목별 갱신 정책

| 선계산 항목 | 갱신 시점 | 갱신 범위 | 이유 |
|---|---|---|---|
| 노드 자체 / 엣지 | **즉시** | 추가분 | 기본 그래프는 무조건 최신 |
| 임베딩 | **즉시** (새 노드만) | 새 노드 | 검색 누락 방지 |
| Confidence score | **즉시** | 새 엣지 | 엣지 생성 시 LLM이 같이 뽑음 |
| Descendants / ancestors | **즉시, 영향 subtree만** | 새 엣지 A→B의 경우 A의 모든 ancestor의 descendants set에 B subtree 합치기 | 핵심 쿼리 타겟, stale 금지 |
| Leiden 클러스터 | **배치** (야간 또는 N개 누적) | 전역 | 전체 재계산 필요, 비쌈 |
| BM25 인덱스 | **증분 업데이트** | 추가 토큰만 | 라이브러리 대부분 지원 |
| 학습 경로 캐시 | **관련 경로만 무효화** | 영향받는 entry point | 영향 추적 가능 |
| 360 context 캐시 | **lazy 무효화** | 영향 노드만 | 재계산 저렴 |

### 6.3 Staleness 관리

GitNexus의 `group_status` 패턴 차용:
- 각 선계산 결과에 `computedAt` 타임스탬프 + `sourceVersion` 해시 저장
- 원본 강의안 `updatedAt` 또는 청크 해시와 비교해 **stale 플래그** 산출
- UI 노출 원칙:
  - **Soft stale**: 노드 옆에 작은 인디케이터, 사용엔 지장 없음
  - **Hard stale**: 쿼리 결과에 "이 분석은 낡음, 갱신하기" 토스트
- 배치 잡이 주기적으로 stale 항목 재계산 (사용자 개입 없음)

### 6.4 Diff 업로드 대응 (강의안 v1 → v2)

GitNexus `detect_changes` 패턴 차용:
1. v1, v2 청크 유사도 매칭 (임베딩 cosine + 해시) → **변경 / 추가 / 삭제** 분류
2. 변경 청크에 연결된 노드만 LLM 재추출
3. 추가 청크 → 신규 노드 후보 제안
4. 삭제 청크의 노드 처리:
   - **즉시 삭제 금지** — 사용자의 노트·이해 상태 보존
   - `orphan` 플래그 + UI에서 "출처 강의안에서 제거됨, 유지할까요?" 확인 후 처리

### 6.5 노드 ID 안정성

재업로드 시 같은 개념의 노드 id가 바뀌면 사용자의 노트·이해 체크·로드맵 위치가 전부 깨진다.
- id는 **청크 위치 기반이 아니라 의미 기반 해시** (정규화된 개념 라벨 + 정의 임베딩 centroid)
- v2 인덱싱 시 v1 노드와 fuzzy match → 같으면 id 유지
- 사용자 수정이 들어간 노드는 고유 id를 영구 보존 (소스 바뀌어도 살아남음)

### 6.6 재인덱싱 트리거 종류

| 트리거 | 범위 | UX |
|---|---|---|
| 강의안 신규 업로드 | 해당 강의안 내부 full | 진행 표시, 완료 시 알림 |
| 강의안 수정 업로드 | diff 기반 델타 | "~개 노드 변경됨" 요약 |
| 노드/엣지 수동 편집 | 영향 subtree만 | 즉시 반영 |
| 야간 배치 | 전역 클러스터, 콜드 캐시 웜업 | 사용자 무감 |
| 수동 "전체 재분석" 버튼 | full rebuild | 비상용, 확인 모달 |

---

## 7. 운영 설계 — 배포 시 유저별 DB 관리

### 7.1 테넌시 아키텍처 3안

| 안 | 설명 | 장점 | 단점 | 적합 |
|---|---|---|---|---|
| **(A) 유저별 독립 DB** | 인스턴스/스키마 분리 | 격리 강함, 백업·삭제 단순 | 비쌈, 과투자 | 엔터프라이즈 B2B |
| **(B) 공유 DB + RLS** | 단일 DB, 테이블에 user_id + Row-Level Security | 저렴, 운영 단순, 탄력적 스케일 | user_id 누락 시 사고 | **Deepy 권장** |
| **(C) 로컬 퍼스트** | 유저 기기에 인덱스 저장, 서버는 동기화만 | 프라이버시 강, 서버 비용 0 | 디바이스 간 동기화 까다로움 | 데스크톱/오프라인 |

### 7.2 권장 스택 — B + 선택적 C

**기본: 서버 공유 DB + user_id 격리**

| 데이터 종류 | 저장소 | 비고 |
|---|---|---|
| 그래프 메타 (노드/엣지/confidence) | Postgres | 메인 트랜잭션 DB |
| 임베딩 | pgvector (소규모) → Qdrant/Pinecone (대규모) | **전체 용량의 ~90% 차지** |
| 전문 검색 (BM25) | Postgres FTS → Meilisearch (대규모) | 증분 업데이트 지원 |
| 학습 상태 (이해/체크/노트) | Postgres | 유저 데이터 핵심, 백업 최우선 |
| 원본 파일 (PDF/슬라이드) | S3 / R2 object storage | 메타만 DB |
| 선계산 캐시 (360 context 등) | Redis (TTL) | 휘발성 OK |

**선택: 로컬 캐시**
유저가 "오프라인 저장" 선택 시 IndexedDB로 동기화. 기본 모드 아님.

### 7.3 격리와 보안

- **Row-Level Security(RLS)**: 모든 쿼리에 `user_id = auth.uid()` 자동 강제 (Supabase 기본 지원)
- **미들웨어 방어선**: API 계층에서도 user_id 검증 (DB RLS만 믿지 않음, defense in depth)
- **감사 로그**: 쓰기 작업은 user_id + 시각 기록
- **키 분리**: 임베딩 저장소는 서비스 키로만 접근, 클라이언트 직접 접근 금지

### 7.4 용량/쿼터 정책 (Freemium 예시)

| 플랜 | 강의 수 | 총 저장 | 임베딩 모델 | LLM 인덱싱 쿼터 |
|---|---|---|---|---|
| **Free** | 5개 | ~15MB | 소형 (384-dim) | 월 10회 인덱싱 |
| **Pro** | 무제한 | 5GB | 표준 (1536-dim) | 무제한 |
| **Team** | 공유 워크스페이스 | 50GB | 표준 + 우선순위 | 무제한 + 배치 우선 |

**산정 근거**: 강의 1개 ≈ 2.5MB (임베딩 1.8MB + 그래프·인덱스 0.7MB)
- Free 5개 = 12.5MB, 여유 두고 15MB
- Pro 5GB = 실질 2000강의 (사실상 무제한 체감)

### 7.5 비용 구조 — 임베딩이 90%

저장 용량 대부분은 임베딩이고, LLM 인덱싱 토큰 비용 대부분도 임베딩·confidence·요약에서 발생한다.

**최적화 포인트**:
- Free 플랜은 **소형 임베딩 모델** (384-dim float16 = 768B/노드)로 4배 절감
- Pro 이상만 1536-dim 표준
- **Cold data 정책**: 3개월 미접근 강의의 임베딩은 object storage로 내림 (쿼리 시 복구, 수 초 지연 허용)
- 임베딩 전용 vector DB로 분리하면 Postgres는 가볍게 유지

### 7.6 운영 체크리스트

- [ ] **격리**: RLS 정책 작성 + API 미들웨어 이중 방어
- [ ] **쿼터 enforcement**: 업로드 시 용량 체크 (DB 트리거 또는 API gate)
- [ ] **가비지 컬렉션**: 강의 삭제 시 임베딩·인덱스·원본 파일 트랜잭션으로 동시 정리
- [ ] **백업/복원**: 유저 단위 export (JSON 번들 + 원본 파일)
- [ ] **탈퇴/GDPR**: `DELETE FROM ... WHERE user_id = ?` 로 완전 삭제 가능
- [ ] **비용 관측**: 유저별 LLM 토큰·저장 용량·쿼리 수 메트릭 대시보드
- [ ] **Cold data 정책**: 3개월+ 미접근 자료 자동 다운그레이드
- [ ] **스케일 임계**: pgvector 노드 수 100만 넘으면 Qdrant 이관 검토
- [ ] **레이트 리밋**: 인덱싱 동시성 제한 (유저당 1개, 전체 N개)

### 7.7 확장 단계별 권장 구성

| 단계 | 유저 수 | 구성 |
|---|---|---|
| **MVP** | ~100 | Supabase(Postgres+pgvector+Storage) 단독, 로컬 개발 |
| **Early** | ~10k | + Meilisearch, + Redis 캐시, 배치 잡 분리 |
| **Growth** | ~100k | + 전용 vector DB(Qdrant), object storage 분리, read replica |
| **Scale** | 100k+ | Shard by user_id, cold tier 아카이빙, 멀티 리전 |

---

## 8. 논의할 오픈 이슈

- [ ] 선계산 레이어의 저장소: 인메모리 vs 디스크 캐시 vs DB?
- [ ] Confidence score 산출 방식: LLM self-rate vs 근거 청크 수 vs 하이브리드?
- [ ] 동의어 병합(B7) 자동 vs 사용자 확인?
- [ ] Leiden 재도입 범위: 시각 제외, 검색 라우팅 한정으로 안전한가?
- [ ] 360 context 응답 스키마 설계 — UI와 agent tool이 공유 가능한 형태?
- [ ] v2 재업로드 시 노드 id 안정성 (diff 매핑 기반)
