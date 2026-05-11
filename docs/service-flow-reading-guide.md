# Deepen 서비스 플로우차트 읽기 가이드

이 문서는 다음 두 파일을 함께 보면서 Deepen의 전체 서비스 흐름, 현재 구현 상태, 병목, 부족한 점을 빠르게 이해하기 위한 가이드입니다.

- `docs/service-flow-implementation-status.pdf`: 전체 End-to-End 흐름과 구현 상태를 한 장으로 보는 지도
- `docs/service-flow-node-details.pdf`: 각 노드의 역할, 구현 정도, 미구현/보강점을 설명한 상세판

## 1. 먼저 전체 흐름을 이렇게 읽으면 된다

Deepen의 핵심 사용자 여정은 다음 순서입니다.

1. 사용자가 랜딩 페이지에 들어온다.
2. 이메일 매직링크로 로그인한다.
3. PDF를 업로드한다.
4. 서버가 PDF를 Storage에 저장하고 문서 row를 만든다.
5. 백그라운드 파이프라인이 PDF를 파싱하고, chunk/section을 만들고, LLM으로 개념 노드와 관계를 추출한다.
6. 추출된 결과가 `documents`, `chunks`, `nodes`, `edges`, `chunk_node_mappings`에 저장된다.
7. `/graph` 화면이 DB에서 nodes/edges를 불러와 그래프로 보여준다.
8. 사용자는 그래프에서 필터링, 출처 확인, 로드맵 탐색, 노트/문서 탭, Agent Chat을 사용한다.
9. Agent는 현재 그래프를 읽고, 필요하면 tool을 호출하며, 노드/엣지 추가 같은 변경 작업은 승인 후 실행한다.
10. 사용자는 문서 목록에서 문서를 관리하고, 문서 삭제 시 관련 chunk/mapping/orphan node가 정리된다.

즉, 이 서비스의 핵심은 단순한 PDF 뷰어가 아니라 **PDF를 지식 그래프로 변환하고, 그 그래프 위에서 탐색/학습/Agent 작업을 하는 구조**입니다.

## 2. 색상 기준

`service-flow-implementation-status.pdf`에서 색상은 다음 의미입니다.

- 초록: 현재 코드로 구현되어 있음
- 노랑: 기능은 있으나 제한적이거나 상용 운영에는 부족함
- 빨강: 아직 없거나, 상용 서비스 전에 반드시 보강해야 함
- 회색: 외부 서비스 또는 기반 인프라

중요한 점은 노랑이 “쓸 수 없다”는 뜻은 아닙니다. MVP나 내부 테스트에서는 동작하지만, 사용자가 늘거나 돈을 받고 운영할 때 장애/비용/동기화 문제가 생길 가능성이 큰 영역입니다.

## 3. 현재 잘 구현된 축

### 인증과 기본 라우팅

랜딩, 로그인, Supabase Auth callback, 세션 갱신은 구현되어 있습니다. 현재 구조는 초기 SaaS에 적합합니다.

다만 상용화 전에는 약관, 개인정보 처리, 계정 삭제, 이메일 발송 제한, abuse 방지, 조직/팀 권한 모델을 추가해야 합니다.

### PDF 업로드 기본 흐름

PDF 업로드, 30MB 검증, Supabase Storage 저장, `documents` row 생성, 202 응답은 잘 잡혀 있습니다.

응답을 즉시 반환하고 후속 처리를 백그라운드로 넘기는 방향도 맞습니다. 사용자가 업로드 후 오래 기다리지 않게 만드는 구조입니다.

### PDF에서 그래프를 만드는 파이프라인

현재 파이프라인은 다음 단계를 실제로 수행합니다.

- PDF 파싱
- chunk 생성
- section grouping
- LLM 기반 노드/관계 추출
- 노이즈 필터링
- 중복 제거
- `chunks`, `nodes`, `edges`, `chunk_node_mappings` 저장
- 토큰 사용량 기록

이 부분은 서비스의 핵심 엔진이며, MVP 기준으로는 이미 상당히 많이 구현되어 있습니다.

### 그래프 탐색 UI

`/graph`에서 DB 기반 nodes/edges를 불러오고, Reagraph로 2D/3D 그래프를 보여주는 흐름이 구현되어 있습니다.

필터, 검색, 로컬 탐색, gap mode, 노드 상세, 출처 보기, 우측 패널, Agent Chat 진입까지 연결되어 있습니다.

### 문서 삭제와 출처 추적

문서 삭제 시 Storage PDF 삭제, document/chunk/mapping cascade, orphan node 정리까지 구현되어 있습니다.

노드 출처도 `chunk_node_mappings`를 통해 어떤 문서 chunk에서 왔는지 추적할 수 있습니다. 이 구조는 신뢰성 있는 지식 그래프 서비스에서 중요합니다.

## 4. 가장 큰 병목

### 병목 1: PDF 처리 파이프라인이 명시적 Job Queue가 아니다

현재 가장 큰 구조적 병목입니다.

지금은 `/api/documents/upload`가 응답한 뒤 `after()` 훅으로 `processDocument()`를 실행합니다. MVP에는 괜찮지만, 실제 서비스에서는 다음 문제가 생길 수 있습니다.

- 서버리스 인스턴스 종료 시 작업이 끊길 수 있음
- 실패한 step만 재시도하기 어려움
- 동시에 많은 PDF가 올라오면 작업량 제어가 어려움
- 같은 문서가 중복 처리될 수 있음
- 사용자가 현재 몇 단계까지 처리됐는지 알기 어려움
- 운영자가 실패 작업을 다시 실행하기 어려움

필요한 보강은 다음입니다.

- `document_jobs` 테이블
- `job_steps` 또는 `document_processing_events`
- `status`, `retry_count`, `locked_at`, `started_at`, `finished_at`, `error_message`
- worker 프로세스 또는 managed queue
- dead-letter queue
- step별 idempotency

이 병목을 해결하면 업로드/파싱/LLM 추출의 안정성이 크게 올라갑니다.

### 병목 2: LLM 비용과 속도 제어가 약하다

Deepen은 LLM 호출이 핵심 비용입니다. PDF 추출과 Agent Chat 모두 LLM을 사용합니다.

현재 `token_usage` 기록은 있지만, 다음이 부족합니다.

- 사용자별 월간 token quota
- 요금제별 사용량 제한
- 문서당 최대 처리 비용
- Agent tool 호출 제한
- OpenAlex/LLM API rate limit
- 과금 초과 시 graceful degradation

돈을 받고 서비스할 때는 Vercel/Supabase 비용보다 LLM 비용이 먼저 문제가 될 가능성이 큽니다.

필요한 보강은 다음입니다.

- `usage_limits` 또는 plan config
- user/month usage aggregate
- 업로드 전 예상 비용 표시
- 문서 처리 중 비용 cap 도달 시 중단
- Agent tool별 rate limit
- 관리자용 사용량 대시보드

### 병목 3: Agent 승인 플로우가 in-memory다

현재 Agent의 승인 대기는 서버 메모리 `Map`에 저장됩니다. 로컬 개발이나 단일 인스턴스에서는 동작하지만, 상용 서버리스 환경에서는 안전하지 않습니다.

문제가 되는 상황은 다음입니다.

- 요청을 처리한 인스턴스와 승인 요청을 받은 인스턴스가 다를 수 있음
- 인스턴스가 재시작되면 pending approval이 사라짐
- 승인 이력이 남지 않음
- 누가 어떤 변경을 승인했는지 감사하기 어려움

필요한 보강은 다음입니다.

- `agent_approval_requests` 테이블
- `agent_tool_calls` 테이블
- 승인 상태: pending / approved / rejected / expired
- 만료 시간
- 승인자 user_id
- tool args snapshot
- 실행 결과 snapshot

Agent가 그래프를 변경할 수 있는 서비스라면 이 부분은 상용화 전에 반드시 DB 기반으로 바꾸는 게 맞습니다.

### 병목 4: 검색/로드맵이 아직 클라이언트 중심이다

현재 `/search`는 graph data를 불러온 뒤 브라우저 메모리에서 검색합니다. 소규모 그래프에서는 괜찮지만, 문서가 늘어나면 한계가 옵니다.

부족한 점은 다음입니다.

- 서버 검색 API 부재
- Postgres full-text index 부재
- semantic search/vector search 부재
- 추천 로직의 품질 평가 부재
- 로드맵 저장/공유/진도 기록 부재

필요한 보강은 다음입니다.

- `/api/search`
- node/chunk full-text index
- pgvector 기반 embedding search
- 검색 결과 ranking
- `roadmaps` 테이블
- `roadmap_steps` 테이블
- 사용자별 progress 저장

### 병목 5: 화이트보드 상태가 완전히 서버 동기화되지 않는다

화이트보드는 제품 경험상 중요하지만 현재는 부분 구현입니다.

문제는 다음입니다.

- 위치/그룹/확장 상태가 localStorage 중심
- 다른 기기에서 같은 화이트보드를 이어가기 어려움
- 직접 진입 시 sample data로 초기화될 수 있음
- undo/redo, optimistic rollback, audit trail이 없음

필요한 보강은 다음입니다.

- `whiteboards` 테이블
- `whiteboard_nodes` 테이블: position, size, expanded, section_id
- `whiteboard_sections` 테이블
- 변경 이벤트 저장
- 서버 저장 API
- 클라이언트 optimistic update + rollback

## 5. 부족한 제품 기능

### 문서 상세 화면

현재 문서 목록과 삭제는 구현되어 있지만, 문서 하나를 열어 다음을 보는 화면은 부족합니다.

- 전체 chunk 목록
- section 구조
- 추출된 nodes
- 추출된 edges
- 처리 실패 section
- 원문 page와 그래프 노드 연결

이 화면은 디버깅에도 중요하고, 사용자가 “왜 이 개념이 나왔는지” 이해하는 데도 중요합니다.

### 로드맵의 영속성

현재 로드맵은 그래프 위 overlay로는 동작하지만, 제품 기능으로는 아직 약합니다.

부족한 점은 다음입니다.

- 저장된 로드맵 목록
- 로드맵 이름/설명
- 단계별 완료 상태
- 공유 링크
- Agent가 생성한 로드맵의 출처/근거

### 운영자 도구

상용 서비스에서 꼭 필요한데 아직 없는 영역입니다.

- 실패한 문서 처리 작업 목록
- 특정 사용자 사용량 조회
- LLM 비용 상위 사용자
- 에러 로그/알림
- Storage cleanup 실패 작업
- 강제 재처리
- 사용자 지원용 admin view

## 6. 데이터 모델 관점에서 이해하기

현재 데이터 모델은 다음 흐름으로 읽으면 됩니다.

`users`

사용자 계정의 기준입니다. Supabase Auth의 `auth.users`와 연결됩니다.

`documents`

업로드된 PDF의 메타데이터입니다. 처리 상태도 여기에 있습니다.

`chunks`

PDF에서 추출된 텍스트 단위입니다. 그래프 노드의 출처가 됩니다.

`nodes`

지식 그래프의 개념 단위입니다. concept, technique, question, memo 등이 들어갑니다.

`edges`

노드 간 관계입니다. 현재는 prerequisite, contains, relatedTo 중심입니다.

`chunk_node_mappings`

어떤 chunk에서 어떤 node가 나왔는지 연결합니다. 출처 추적의 핵심입니다.

`token_usage`

LLM 호출 비용을 추적합니다. 아직 비용 제한 정책까지는 연결되지 않았습니다.

이 모델은 방향이 좋습니다. 특히 `chunk_node_mappings`가 있기 때문에 “LLM이 만든 그래프”의 출처를 역추적할 수 있습니다.

## 7. 상용화 전 우선순위

### 1순위: PDF 처리 Job Queue

가장 먼저 해야 합니다. 지금 구조에서 사용자가 늘면 제일 먼저 문제가 생길 가능성이 큽니다.

목표는 “업로드 요청”과 “문서 처리 작업”을 완전히 분리하는 것입니다.

### 2순위: LLM 비용 제한

무료/유료 플랜을 만들려면 비용 제한이 필요합니다.

최소한 사용자별 월 사용량, 문서당 최대 토큰, Agent tool 호출 제한은 있어야 합니다.

### 3순위: Agent 승인 영속화

Agent가 DB를 변경할 수 있기 때문에 승인 요청과 실행 결과는 반드시 기록되어야 합니다.

### 4순위: 문서 상세/처리 디버깅 화면

사용자 신뢰와 운영 디버깅에 모두 필요합니다.

### 5순위: 검색/로드맵 서버화

문서가 늘어날수록 클라이언트 검색은 한계가 옵니다. full-text search와 vector search를 단계적으로 붙이면 됩니다.

### 6순위: 화이트보드 서버 저장

화이트보드를 핵심 기능으로 밀고 갈 계획이면 반드시 필요합니다. 단, PDF→그래프→Agent가 핵심이면 우선순위는 조금 뒤로 둘 수 있습니다.

## 8. 현재 구조의 결론

현재 Deepen은 “MVP 데모” 수준을 넘어서 핵심 기능의 뼈대는 꽤 많이 구현되어 있습니다.

강점은 다음입니다.

- PDF 업로드에서 그래프 생성까지의 핵심 파이프라인이 있음
- 그래프 탐색 UI가 실제 DB 데이터와 연결되어 있음
- 출처 추적 모델이 있음
- Agent tool calling과 승인 흐름이 있음
- 문서 삭제와 orphan 정리가 구현되어 있음

하지만 상용 서비스로 가려면 다음이 부족합니다.

- 안정적인 백그라운드 작업 처리
- 비용/사용량 제한
- Agent 승인/변경 이력 영속화
- 서버 검색/로드맵 저장
- 운영자 도구와 장애 복구 흐름

따라서 현재 상태는 **유료 베타를 준비할 수 있는 기반은 있지만, 일반 공개 유료 서비스 전에 운영 안정성 레이어를 보강해야 하는 단계**로 보는 것이 맞습니다.

## 9. 두 PDF를 같이 보는 방법

추천 순서는 다음입니다.

1. `service-flow-implementation-status.pdf`를 먼저 열고 전체 레인의 색을 본다.
2. 빨강/노랑 박스를 체크한다.
3. 같은 항목을 `service-flow-node-details.pdf`에서 찾아 역할과 미구현 내용을 읽는다.
4. 병목은 이 문서의 4장을 기준으로 우선순위를 잡는다.
5. 실제 개발 계획은 7장의 상용화 전 우선순위를 기준으로 쪼갠다.

이렇게 보면 “무엇이 이미 돌아가는지”와 “무엇이 제품 판매 전에 반드시 필요한지”를 분리해서 판단할 수 있습니다.
