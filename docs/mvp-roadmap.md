# Deepen MVP 로드맵

## 4개 핵심 엔진

| # | 엔진 | 하는 일 | 데이터 소스 |
|---|------|--------|-----------|
| 1 | **Paper Content Understanding** | 논문이 뭘 했는지 풀어줌 (핵심 기여, 방법론, 결과, 의의) | 오픈액세스 PDF 전문 → Claude API |
| 2 | **6-Layer Analysis** | 논문 주변 맥락 6방향 분석 | 메타데이터 + 초록 + 인용관계 → Claude API |
| 3 | **Recommendation** | 레이어별 관련 논문 추천 | Citation intent + graph traversal (S2 API) |
| 4 | **Roadmap Generation** | 키워드+난이도 → 학습 경로 설계 | 인용 그래프 분석 + Claude API |

### 엔진 의존성

```
            ┌──────────────┐
            │ Data Pipeline │  (OpenAlex + Supabase + 검색)
            └──────┬───────┘
        ┌──────────┼──────────┐
        ▼          ▼          ▼
    Engine 1   Engine 2   Engine 3
    (Content)  (6-Layer)  (Recommend)
        └──────────┼──────────┘
                   ▼
               Engine 4
              (Roadmap)
```

Engine 1, 2는 병렬 가능. Engine 3은 인용 데이터 필요. Engine 4는 1~3 모두 필요.

---

## Phase 0: 인프라 기반 (Week 1-2)

**목표**: DB, ORM, 외부 API 클라이언트, 프로젝트 구조 셋업

### 추가 의존성
- `@supabase/supabase-js`, `drizzle-orm`, `drizzle-kit`
- `@anthropic-ai/sdk`
- `unpdf` (PDF 텍스트 추출, WASM 기반)
- `zod` (API 응답 검증)

### DB 스키마 (Supabase PostgreSQL)

기존 docs에 정의된 7개 테이블 + Engine 1용 1개 추가:

| 테이블 | 용도 |
|--------|------|
| `papers` | 논문 메타데이터 캐시 |
| `paper_relations` | 인용 그래프 |
| `concepts` | OpenAlex 개념 분류 |
| `paper_concepts` | 논문-개념 연결 |
| `layers` | 6-Layer AI 콘텐츠 캐시 |
| `paper_content` | **NEW** - PDF 기반 내용 분석 캐시 |
| `roadmaps` | 학습 로드맵 |
| `user_progress` | 학습 진행 상태 |

`paper_content` 스키마:

```sql
CREATE TABLE paper_content (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id        UUID REFERENCES papers(id),
  content         JSONB,          -- {core_contribution, methodology, key_results, significance, limitations, plain_language_summary}
  source_pdf_url  TEXT,
  language        TEXT DEFAULT 'ko',
  generated_at    TIMESTAMPTZ DEFAULT now(),
  model_version   TEXT,
  UNIQUE(paper_id, language)
);
```

### 디렉토리 구조

```
app/
├── api/
│   ├── papers/
│   │   ├── search/route.ts              # 키워드 검색
│   │   └── [id]/
│   │       ├── route.ts                  # 논문 상세
│   │       ├── content/route.ts          # Engine 1: 내용 분석
│   │       ├── layers/route.ts           # Engine 2: 6-Layer
│   │       └── recommendations/route.ts  # Engine 3: 추천
│   └── roadmap/
│       ├── generate/route.ts             # Engine 4: 로드맵 생성
│       └── [id]/
│           ├── route.ts                  # 로드맵 조회
│           └── progress/route.ts         # 진행 상태 업데이트

lib/
├── db/
│   ├── index.ts              # Drizzle + Supabase 연결
│   ├── schema.ts             # 테이블 스키마 정의
│   └── migrations/
├── clients/
│   ├── openalex.ts           # OpenAlex API
│   ├── semantic-scholar.ts   # Semantic Scholar API
│   ├── arxiv.ts              # arXiv API (PDF URL)
│   └── claude.ts             # Claude API 래퍼
├── engines/
│   ├── paper-content.ts      # Engine 1
│   ├── six-layer.ts          # Engine 2
│   ├── recommendations.ts    # Engine 3
│   └── roadmap.ts            # Engine 4
├── prompts/
│   ├── paper-content.ts      # Engine 1 프롬프트
│   ├── six-layer.ts          # Engine 2 프롬프트
│   └── roadmap.ts            # Engine 4 프롬프트
└── utils/
    ├── pdf-parser.ts         # PDF 텍스트 추출
    ├── cache.ts              # 캐시 TTL 관리
    └── rate-limiter.ts       # 외부 API rate limit
```

### 환경 변수

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `OPENALEX_EMAIL` (polite pool용)
- `SEMANTIC_SCHOLAR_API_KEY` (선택)

### 마일스톤

`GET /api/papers/search?q=transformer` → OpenAlex에서 검색 → DB 캐싱 → 결과 반환

---

## Phase 1: 검색 + 논문 내용 이해 엔진 (Week 3-4)

**목표**: 사용자가 검색 → 논문 선택 → AI가 논문 내용을 풀어서 설명

### 1A: 논문 검색

- `GET /api/papers/search?q={keyword}`
- 흐름: DB 캐시 확인(7일 TTL) → 미스 시 OpenAlex 호출 → upsert → 반환
- 프론트: `app/search/page.tsx` - 검색바 + 결과 카드 리스트

### 1B: Paper Content Understanding Engine (Engine 1)

- `GET /api/papers/[id]/content`
- 흐름:
  1. `paper_content` 캐시 확인 (30일 TTL)
  2. 캐시 미스 → PDF URL 확인 (OpenAlex `open_access.oa_url` 또는 arXiv)
  3. PDF가 없으면 → 초록 기반 분석으로 폴백 (degraded but useful)
  4. PDF fetch → `unpdf`로 텍스트 추출 (PDF 자체는 저장하지 않음)
  5. 섹션 우선순위: Abstract > Introduction > Method > Results > Conclusion
  6. Claude API → 구조화된 분석 생성
  7. 캐시 저장 후 반환

- Claude 출력 구조:

  ```json
  {
    "core_contribution": "이 논문의 핵심 기여 (1문단)",
    "methodology": "방법론 단계별 설명",
    "key_results": "주요 결과와 의미",
    "significance": "왜 중요한 논문인지",
    "limitations": "저자가 인정하는 한계",
    "plain_language_summary": "비전문가도 이해할 수 있는 설명"
  }
  ```

- 프론트: `app/papers/[id]/page.tsx`
  - 논문 헤더 (제목, 저자, 연도, 인용수, DOI 링크)
  - "AI가 분석한 내용입니다" 라벨 (법적 필수)
  - 탭/아코디언: 핵심 기여, 방법론, 주요 결과, 의의, 한계, 쉬운 설명
  - "원문 보기" 버튼 (DOI/arXiv 링크)

### 마일스톤

사용자가 "attention mechanism" 검색 → 논문 클릭 → AI가 풀어서 설명해줌

---

## Phase 2: 6-Layer 분석 엔진 (Week 5-6)

**목표**: 논문 내용을 이해한 뒤, 주변 맥락 6가지를 탐색

- `GET /api/papers/[id]/layers`
- 데이터 수집 (병렬): OpenAlex 상세 + concepts + referenced_works + cited_by
- Claude API → 6개 레이어 콘텐츠 생성 → `layers` 테이블 캐싱

- 프론트: `app/papers/[id]` 내 6-Layer 탭
  - 각 레이어 내 언급된 논문은 `/papers/[id]`로 링크 (클릭 탐색 가능)
  - Deepy 캐릭터 "thinking" 애니메이션 로딩

### 마일스톤

논문 상세 → "6-Layer 분석" → 6개 맥락 레이어 표시, 내부 논문 클릭으로 탐색

---

## Phase 3: 추천 알고리즘 (Week 7-8)

**목표**: 각 레이어에 맞는 관련 논문 추천

- `GET /api/papers/[id]/recommendations?layer={layer_type}`
- 레이어별 전략 (`recommendation-algorithm-research.md` 기반):

| 레이어 | 방향 | 핵심 필터 |
|--------|------|----------|
| Prior Work | Backward | intent=background |
| Key Concepts | 양방향 | co-citation + 유사도 |
| Pipeline | Backward+Forward | intent=methodology |
| Follow-ups | Forward | isInfluential + result/method |
| Industry Use | Forward | venue/소속 필터 |
| Open Questions | Forward frontier | 저인용 + 최신 |

- MVP: Semantic Scholar API의 intent + isInfluential 필터링만으로 구현 (자체 ML 불필요)

### 마일스톤

각 6-Layer 탭에 3-5개 관련 논문이 추천 사유와 함께 표시

---

## Phase 4: 로드맵 생성 엔진 (Week 9-10)

**목표**: 키워드 + 난이도 → 5~10편 최적 학습 경로

- `POST /api/roadmap/generate` body: `{ keyword, difficulty }`
- 흐름: 50편 검색 → 상위 20편 인용 그래프 → seminal papers 식별 → Claude가 순서 설계
- 로드맵 내 논문들의 Engine 1 + Engine 2 분석을 백그라운드 프리워밍

- 프론트: `app/roadmap/page.tsx` (생성), `app/roadmap/[id]/page.tsx` (학습 경로)
  - 세로 스텝 UI, 각 스텝에 논문 클릭 → 상세 페이지
  - 완료 체크, 진행률 바

### 마일스톤

"reinforcement learning" + beginner → 7편 로드맵 → 클릭하면 각 논문 분석 표시

---

## Phase 5: 인증 + 사용자 상태 (Week 11-12)

**목표**: 로드맵 저장, 진행 추적, 개인 학습 기록

- Supabase Auth (이메일 + Google OAuth)
- RLS로 `roadmaps`, `user_progress` 보호
- **Phase 5가 마지막인 이유**: 핵심 엔진은 로그인 없이 체험 가능 → 가치 확인 후 가입 유도

- 프론트: `app/dashboard/page.tsx` - 내 로드맵, 최근 논문, 읽은 수, 연속일

---

## 캐싱 정책

| 데이터 | TTL | 비고 |
|--------|-----|------|
| 논문 메타데이터 | 7일 | OpenAlex 변경 반영 |
| 인용 그래프 | 14일 | |
| Paper Content (Engine 1) | 30일 | PDF 기반 분석 |
| 6-Layer (Engine 2) | 30일 | |
| 로드맵 | 영구 | 사용자 소유 |

---

## 법적 준수 (모든 Phase 공통)

- AI 생성 콘텐츠에 `"ai_generated": true` + 라벨 표시
- 모든 논문에 DOI 원문 링크 제공
- PDF는 스트림 파싱만, 절대 저장 안 함
- 초록은 CC0/OA만 표시
- Semantic Scholar 데이터는 무료 기능에만 사용

---

## 비용 추정 (Claude API)

| 엔진 | 입력 토큰 | 출력 토큰 | 건당 비용 |
|------|----------|----------|----------|
| Engine 1 (Content) | 5K-50K | ~2K | $0.01-0.18 |
| Engine 2 (6-Layer) | ~3K | ~4K | ~$0.07 |
| Engine 4 (Roadmap) | ~5K | ~2K | ~$0.04 |

캐싱 히트 시 $0. 두 번째 요청부터 무료.

---

## 타임라인 요약

| Phase | 기간 | 결과 | 사용자 경험 |
|-------|------|------|-----------|
| **0** | Week 1-2 | DB, API 클라이언트, 구조 | (내부) |
| **1** | Week 3-4 | 검색 + Engine 1 | 검색 → 논문 내용 이해 |
| **2** | Week 5-6 | Engine 2 | + 6가지 맥락 탐색 |
| **3** | Week 7-8 | Engine 3 | + 레이어별 관련 논문 |
| **4** | Week 9-10 | Engine 4 | + 학습 로드맵 |
| **5** | Week 11-12 | Auth + 진행 추적 | + 저장/기록 |

**Core MVP = Phase 0~2 (6주)**: 검색 + 내용 이해 + 6-Layer. 핵심 가치 검증 가능.
**Full MVP = Phase 0~4 (10주)**: 4개 엔진 모두. 로그인 없이 전체 기능.
**Launch = Phase 0~5 (12주)**: 사용자 계정 + 진행 추적 포함.
