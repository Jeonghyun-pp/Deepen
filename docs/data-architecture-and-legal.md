# Deepen - 논문 데이터 아키텍처 & 법적 검토 문서

> 최종 업데이트: 2026-04-03
> 상태: 초안 (Draft)

---

## 목차

1. [개요](#1-개요)
2. [데이터 소스 및 API 활용](#2-데이터-소스-및-api-활용)
3. [데이터 보관 전략](#3-데이터-보관-전략)
4. [API 호출 구조](#4-api-호출-구조)
5. [사용자 로드맵 생성 로직](#5-사용자-로드맵-생성-로직)
6. [법적 검토](#6-법적-검토)
7. [유료화 전략 및 법적 안전성](#7-유료화-전략-및-법적-안전성)
8. [실행 체크리스트](#8-실행-체크리스트)

---

## 1. 개요

Deepen은 논문 메타데이터와 초록을 수집하여 AI 기반 "6-Layer 분석"과 학습 로드맵을 제공하는 서비스다. 이 문서는 데이터를 어디서 가져오고, 어떻게 보관하며, 어떻게 호출하는지에 대한 기술 설계와 법적 검토를 정리한다.

### 6-Layer 분석 모델

| 레이어 | 설명 |
|--------|------|
| Prior Work | 이 논문이 기반한 선행 연구 |
| Key Concepts | 읽기 전 알아야 할 배경 지식 |
| Pipeline | 방법론 단계별 분석 |
| Follow-ups | 이 논문 이후의 후속 연구 |
| Industry Use | 실제 산업 적용 사례 |
| Open Questions | 미해결 문제와 미래 연구 방향 |

---

## 2. 데이터 소스 및 API 활용

### 2.1 API별 역할 분담

| API | 역할 | 커버리지 | 라이선스 | 상업 이용 |
|-----|------|---------|---------|----------|
| **OpenAlex** | 메인 데이터 소스 | ~2.5억 논문, 전 분야 | CC0 (퍼블릭 도메인) | **완전 자유** |
| **Semantic Scholar** | 인용 그래프, 논문 추천 | ~2.1억 논문, CS/의학 강점 | CC BY-NC + API ToS | **상업적 재패키징 금지** |
| **arXiv** | 프리프린트 메타데이터, PDF 링크 | ~250만 논문, CS/물리/수학 | 개별 논문 라이선스 | 메타데이터만 자유 |
| **Claude API** | 6-Layer 콘텐츠 생성, 로드맵 설계 | - | 상업 이용 가능 | 가능 |

> **핵심 원칙**: 유료 기능에는 OpenAlex(CC0)를 메인으로 사용. Semantic Scholar는 무료 기능 또는 별도 라이선스 협의 후 사용.

### 2.2 각 API에서 가져올 데이터

```
OpenAlex API (메인)
├── GET /works?search={keyword}
│   → id, title, abstract, publication_year, cited_by_count, authors
│   → concepts (개념 태그 + relevance score)
│   → referenced_works (인용한 논문 ID 목록)
│   → related_works (관련 논문)
│   → open_access 정보 (OA 여부, PDF URL)
├── GET /works/{id}
│   → 단일 논문 상세 정보
├── GET /concepts/{id}
│   → 개념 간 관계 (상위/하위 개념 트리)
│   → Key Concepts 레이어용
└── GET /authors/{id}
    → 저자 정보, 소속, h-index

Semantic Scholar API (보조 - 무료 기능 한정)
├── GET /paper/search?query={keyword}
│   → paperId, title, abstract, year, citationCount, influentialCitationCount
├── GET /paper/{id}/citations
│   → Follow-ups 레이어용
├── GET /paper/{id}/references
│   → Prior Work 레이어용
└── GET /recommendations/v1/papers
    → 유사 논문 추천

arXiv API (프리프린트 보충)
└── GET /api/query?search_query={keyword}
    → 초록 전문, PDF 링크, 카테고리
```

### 2.3 커버리지 한계

**OpenAlex + Semantic Scholar 조합 시 약 80~90% 커버 가능.**

커버되지 않는 영역:
- 한국어/중국어/일본어 등 비영어권 로컬 저널 (KCI, CNKI 등)
- 일부 유료 출판사 독점 논문 (메타데이터는 있으나 초록 없음)
- 학위논문, 기관 보고서 등 gray literature
- 최신 논문 반영 시간차 (수일~수주)

한국 논문 커버가 필요한 경우:
- KCI (한국학술지인용색인): https://www.kci.go.kr
- RISS (학술연구정보서비스): https://www.riss.kr

---

## 3. 데이터 보관 전략

### 3.1 기술 스택

| 레이어 | 선택 | 이유 |
|--------|------|------|
| DB | Supabase (PostgreSQL) | 무료 티어 충분, Next.js 궁합, RLS 보안 |
| ORM | Prisma 또는 Drizzle | 타입 안전, Next.js 생태계 표준 |
| 캐시 | DB 자체 + Next.js fetch 캐시 | 별도 Redis 불필요 (초기 단계) |

### 3.2 DB 스키마

```sql
-- 논문 (캐싱 + 핵심 저장소)
CREATE TABLE papers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  openalex_id     TEXT UNIQUE,
  semantic_scholar_id TEXT UNIQUE,
  title           TEXT NOT NULL,
  abstract        TEXT,
  authors         JSONB,          -- [{name, openalex_id, institution}]
  year            INT,
  citation_count  INT DEFAULT 0,
  fields          TEXT[],         -- 분야 태그
  pdf_url         TEXT,
  doi             TEXT,
  open_access     BOOLEAN DEFAULT false,
  fetched_at      TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 논문 간 인용 관계 (인용 그래프)
CREATE TABLE paper_relations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_paper_id UUID REFERENCES papers(id),
  target_paper_id UUID REFERENCES papers(id),
  relation_type   TEXT CHECK (relation_type IN ('cites', 'cited_by')),
  UNIQUE(source_paper_id, target_paper_id, relation_type)
);

-- 개념 사전 (OpenAlex Concepts)
CREATE TABLE concepts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  openalex_id       TEXT UNIQUE,
  name              TEXT NOT NULL,
  description       TEXT,
  parent_concept_id UUID REFERENCES concepts(id),
  level             INT           -- 0=대분류, 4=세부
);

-- 논문-개념 연결
CREATE TABLE paper_concepts (
  paper_id        UUID REFERENCES papers(id),
  concept_id      UUID REFERENCES concepts(id),
  relevance_score FLOAT,
  PRIMARY KEY (paper_id, concept_id)
);

-- 6-Layer AI 생성 콘텐츠 (캐싱)
CREATE TABLE layers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id        UUID REFERENCES papers(id),
  layer_type      TEXT CHECK (layer_type IN (
                    'prior_work', 'key_concepts', 'pipeline',
                    'follow_ups', 'industry_use', 'open_questions'
                  )),
  content         JSONB,          -- LLM 생성 결과
  language        TEXT DEFAULT 'ko',
  generated_at    TIMESTAMPTZ DEFAULT now(),
  model_version   TEXT,
  UNIQUE(paper_id, layer_type, language)
);

-- 학습 로드맵
CREATE TABLE roadmaps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  keyword         TEXT NOT NULL,
  difficulty      TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  steps           JSONB,          -- [{order, paper_id, reason, estimated_time}]
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 사용자 학습 진행 상태
CREATE TABLE user_progress (
  user_id         UUID REFERENCES users(id),
  paper_id        UUID REFERENCES papers(id),
  roadmap_id      UUID REFERENCES roadmaps(id),
  status          TEXT CHECK (status IN ('not_started', 'reading', 'completed')),
  completed_at    TIMESTAMPTZ,
  PRIMARY KEY (user_id, paper_id, roadmap_id)
);
```

### 3.3 캐싱 정책

| 데이터 | 저장 위치 | TTL (만료 기간) | 갱신 방식 |
|--------|----------|----------------|----------|
| 논문 메타데이터 | papers 테이블 | 7일 | fetched_at 기준 재조회 |
| 인용 그래프 | paper_relations | 14일 | 주기적 배치 갱신 |
| 6-Layer 콘텐츠 | layers 테이블 | 30일 | 요청 시 재생성 |
| 개념 트리 | concepts 테이블 | 30일 | OpenAlex 변경 시 |
| 로드맵 | roadmaps 테이블 | 영구 | 사용자 요청 시 재생성 |

---

## 4. API 호출 구조

### 4.1 디렉토리 구조

```
app/
├── api/
│   ├── papers/
│   │   ├── search/route.ts        ← 키워드 검색
│   │   └── [id]/
│   │       ├── route.ts            ← 논문 상세
│   │       └── layers/route.ts     ← 6-Layer 콘텐츠
│   ├── roadmap/
│   │   ├── generate/route.ts       ← 로드맵 생성
│   │   └── [id]/route.ts           ← 로드맵 조회/진행상태
│   └── lib/
│       ├── openalex.ts             ← OpenAlex API 클라이언트
│       ├── semantic-scholar.ts     ← Semantic Scholar API 클라이언트
│       └── llm.ts                  ← Claude API 호출
```

### 4.2 호출 흐름: 논문 검색

```
사용자: "Transformer" 검색
         │
         ▼
[GET /api/papers/search?q=Transformer]
         │
         ├── 1. DB 캐시 확인 (papers 테이블)
         │      └── 캐시 히트 & 7일 이내 → 즉시 반환 (~50ms)
         │
         ├── 2. 캐시 미스 → OpenAlex API 호출
         │      GET https://api.openalex.org/works?search=Transformer&per_page=20
         │      → ~200ms
         │
         ├── 3. 결과를 papers 테이블에 upsert (캐싱)
         │
         └── 4. 응답 반환
```

### 4.3 호출 흐름: 6-Layer 분석

```
사용자: 논문 상세 → 6-Layer 보기
         │
         ▼
[GET /api/papers/{id}/layers]
         │
         ├── 1. layers 테이블에서 캐시 확인
         │      └── 6개 레이어 모두 존재 & 30일 이내 → 즉시 반환
         │
         ├── 2. 캐시 미스 → 데이터 수집 (병렬)
         │      ├── OpenAlex: 논문 상세 + concepts
         │      ├── OpenAlex: referenced_works (인용한 논문들)
         │      └── OpenAlex: cited_by (인용된 논문들)
         │      → ~500ms
         │
         ├── 3. Claude API 호출 → 6-Layer 콘텐츠 생성
         │      → ~3~5s
         │
         ├── 4. layers 테이블에 캐싱
         │
         └── 5. 응답 반환
              첫 요청: ~5s / 캐시 히트: ~50ms
```

### 4.4 호출 흐름: 로드맵 생성

```
사용자: "Transformer 로드맵 만들어줘" (난이도: beginner)
         │
         ▼
[POST /api/roadmap/generate]
  Body: { keyword: "Transformer", difficulty: "beginner" }
         │
         ├── 1. OpenAlex 검색: 관련 논문 상위 50개 수집
         │      → ~300ms
         │
         ├── 2. 인용 그래프 구축 (병렬)
         │      ├── 상위 20개 논문의 referenced_works 조회
         │      └── cited_by_count 기반 핵심 논문 식별
         │      → ~500ms
         │
         ├── 3. 논문 정렬 기준 계산
         │      ├── 영향력 점수 = citation_count × recency_weight
         │      ├── 난이도 추정 = concepts level + 참조 수
         │      └── 의존 관계 = 선수 논문 식별
         │
         ├── 4. Claude API: 로드맵 구성 요청
         │      Input: 논문 리스트 + 인용 관계 + 사용자 수준
         │      Output: 순서가 있는 학습 경로 (5~10편)
         │      → ~3s
         │
         ├── 5. 선택된 논문들의 6-Layer 분석 생성 (병렬)
         │      → ~5s
         │
         ├── 6. roadmaps 테이블에 저장
         │
         └── 7. 응답 반환
              총 ~5~8s (첫 요청) / 캐시 히트 시 ~200ms
```

### 4.5 코드 예시

```typescript
// app/api/lib/openalex.ts
const OPENALEX_BASE = "https://api.openalex.org";

export async function searchPapers(query: string, limit = 20) {
  const res = await fetch(
    `${OPENALEX_BASE}/works?search=${encodeURIComponent(query)}&per_page=${limit}`,
    { next: { revalidate: 86400 } } // 24시간 캐시
  );
  const data = await res.json();
  return data.results.map(normalizePaper);
}

export async function getPaperDetails(openalexId: string) {
  const res = await fetch(`${OPENALEX_BASE}/works/${openalexId}`);
  return normalizePaper(await res.json());
}

export async function getConcepts(conceptId: string) {
  const res = await fetch(`${OPENALEX_BASE}/concepts/${conceptId}`);
  return res.json();
}
```

```typescript
// app/api/papers/search/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  if (!query) return Response.json({ error: "query required" }, { status: 400 });

  // 1. DB 캐시 확인
  const cached = await db.papers.findMany({
    where: {
      title: { search: query },
      fetchedAt: { gte: new Date(Date.now() - 7 * 86400000) },
    },
    orderBy: { citationCount: "desc" },
    take: 20,
  });

  if (cached.length >= 10) return Response.json(cached);

  // 2. OpenAlex API 호출
  const papers = await openalex.searchPapers(query, 20);

  // 3. DB에 캐싱
  await Promise.all(papers.map((p) => db.papers.upsert({
    where: { openalexId: p.openalexId },
    update: { ...p, fetchedAt: new Date() },
    create: p,
  })));

  return Response.json(papers);
}
```

```typescript
// app/api/papers/[id]/layers/route.ts
export async function GET(req: Request, { params }) {
  const { id } = params;

  // 1. 캐시 확인
  const cached = await db.layers.findMany({
    where: {
      paperId: id,
      generatedAt: { gte: new Date(Date.now() - 30 * 86400000) },
    },
  });
  if (cached.length === 6) return Response.json(cached);

  // 2. 데이터 수집 (병렬)
  const paper = await db.papers.findUnique({ where: { id } });
  const [refs, concepts] = await Promise.all([
    openalex.getPaperDetails(paper.openalexId),
    openalex.getConcepts(paper.openalexId),
  ]);

  // 3. Claude API로 6-Layer 생성
  const layers = await generateSixLayers({ paper, refs, concepts });

  // 4. 캐싱
  await db.layers.createMany({ data: layers });

  return Response.json(layers);
}
```

```typescript
// app/api/roadmap/generate/route.ts
export async function POST(req: Request) {
  const { keyword, difficulty, userId } = await req.json();

  // 1. 논문 검색
  const papers = await openalex.searchPapers(keyword, 50);

  // 2. 인용 그래프 구축
  const topPapers = papers.slice(0, 20);
  const graph = await buildCitationGraph(topPapers);

  // 3. Claude에게 로드맵 생성 요청
  const roadmapSteps = await generateRoadmap({
    keyword,
    difficulty,
    papers: topPapers,
    graph,
  });

  // 4. 저장
  const roadmap = await db.roadmaps.create({
    data: { userId, keyword, difficulty, steps: roadmapSteps },
  });

  return Response.json(roadmap);
}
```

---

## 5. 사용자 로드맵 생성 로직

### 5.1 로드맵 생성 알고리즘

```
                    사용자 키워드
                         │
                         ▼
          ┌─────── 논문 검색 (50편) ───────┐
          │                                │
          ▼                                ▼
   영향력 점수 계산                  인용 그래프 분석
   (citation × recency)           (선후 관계 파악)
          │                                │
          └──────────┬─────────────────────┘
                     │
                     ▼
              핵심 논문 식별
         (seminal papers 5~10편)
                     │
                     ▼
            난이도 순 정렬
      (concepts level + 참조 수)
                     │
                     ▼
         Claude API: 순서 최적화
    (의존 관계 고려한 학습 경로)
                     │
                     ▼
              로드맵 완성
    Step 1: 기초 논문 → Step N: 최전선
```

### 5.2 Claude 로드맵 생성 프롬프트

```
당신은 학술 논문 큐레이터입니다.

아래 논문 목록과 인용 관계를 분석하여,
"{keyword}" 주제를 처음 접하는 {difficulty} 수준의 학습자를 위한
학습 로드맵을 만들어주세요.

[논문 목록]
{papers_with_metadata}

[인용 관계]
{citation_graph}

요구사항:
- 5~10편을 선택하여 순서대로 배치
- 각 논문마다: 이 순서에 읽는 이유 한 줄 설명
- 난이도가 점진적으로 증가하도록 배치
- 각 단계의 예상 학습 시간 (분) 포함
- JSON 형식으로 출력

출력 형식:
{
  "steps": [
    {
      "order": 1,
      "paper_id": "...",
      "title": "...",
      "reason": "이 분야의 기초 개념을 정립한 논문",
      "estimated_minutes": 10,
      "prerequisite_steps": []
    }
  ]
}
```

---

## 6. 법적 검토

### 6.1 논문 데이터의 저작권 구분

```
           안전 ◄───────────────────────────► 위험

메타데이터(제목,저자,연도)   초록 표시    본문 요약    PDF 호스팅
      ✅ 자유              ⚠️ 조건부    ⚠️ 조건부    ❌ 불가
```

| 콘텐츠 | 법적 상태 | Deepen 대응 |
|--------|----------|------------|
| 제목, 저자, 연도, 인용수 | 사실 정보 → 저작권 없음 | 자유롭게 사용 |
| 초록 (Abstract) | CC0 소스만 안전, 출판사 소유 초록은 위험 | OpenAlex CC0 초록만 사용, 출처 링크 필수 |
| 6-Layer 콘텐츠 (AI 생성) | 변환적 사용 → 방어 가능 | 원문 복사 없이 분석/재구성만, "AI 분석" 라벨 |
| PDF 본문 | 출판사/저자 저작권 | 절대 호스팅 금지, 원본 링크만 제공 |

### 6.2 "사실 추출" vs "표현 복제"

저작권이 보호하는 것: **표현 (expression)** - 문장 구조, 단어 선택, 서술 방식
저작권이 보호하지 않는 것: **사실/아이디어 (facts/ideas)** - 발견, 데이터, 방법론 자체

| Deepen이 하는 것 | 분류 | 위험도 |
|-----------------|------|-------|
| 메타데이터 표시 | 사실 | 없음 |
| 인용 그래프 → 로드맵 구성 | 사실 기반 새 창작물 | 없음 |
| 초록 → AI 6-Layer 분석 | 변환적 사용 | 낮음 (조건부) |
| 초록 원문 그대로 표시 | 표현 복제 | 중간 |
| 본문 요약 제공 | 파생 저작물 | 높음 |

### 6.3 국가별 법적 근거

#### 미국: Fair Use (공정 이용, 17 U.S.C. Section 107)

| Fair Use 4요소 | Deepen의 경우 | 판단 |
|---------------|-------------|------|
| 목적 및 성격 | 교육/분석 목적, 변환적(transformative) | 유리 |
| 원저작물의 성격 | 학술 논문 = 사실적 저작물 | 유리 |
| 사용된 양 | 초록만 사용, 본문 전체 아님 | 유리 |
| 시장 영향 | 논문 구독을 대체하지 않음 (보완적) | 유리 |

관련 판례:

| 사건 | 연도 | 결과 | Deepen 관련성 |
|------|------|------|-------------|
| NYT v. Microsoft/CIR (SDNY) | 2025.4 | AI 요약본은 원문과 "실질적으로 유사하지 않다" → 기각 | 유리: 6-Layer 분석은 뉴스 요약보다 훨씬 변환적 |
| Advance Local Media v. Cohere (SDNY) | 2025.11 | AI가 뉴스 기사의 대체재 역할 → 침해 인정 | 주의: Deepen이 논문의 "대체재"가 아닌 "보완재"임을 명확히 |
| Bartz v. Anthropic | 2025.6 | LLM 학습 자체는 fair use 인정 | 유리: 학습 단계는 합법 선례 |

> **핵심 기준**: "대체(substitutive)"가 아닌 "변환(transformative)"이면 Fair Use 인정 가능성 높음.

#### 한국: 저작권법 제35조의5 (공정이용)

```
제35조의5 (저작물의 공정한 이용)

저작물의 통상적인 이용 방법과 충돌하지 아니하고
저작자의 정당한 이익을 부당하게 해치지 아니하는 경우에는
저작물을 이용할 수 있다.

판단 기준 (미국 Fair Use와 유사한 4요소):
1. 이용의 목적 및 성격
2. 저작물의 종류 및 용도
3. 이용된 부분의 양과 중요성
4. 저작물의 현재·잠재적 시장에 미치는 영향
```

한국 특이사항:
- TDM(텍스트·데이터 마이닝) 전용 예외 조항이 **아직 없음** (21대 국회에서 발의 실패)
- 2025년 6월 정부 가이드라인 발표, AI 학습 단계에 대한 명시적 판단은 유보
- 현재로서는 제35조의5 일반 공정이용 조항에 의존
- 미국보다 판례 부족으로 불확실성 상존

#### EU: DSM 저작권 지침 (2019/790)

| 조항 | 내용 | Deepen 적용 |
|------|------|------------|
| 제3조 | 학술연구 목적 TDM → opt-out 불가 | 비상업적일 때만 |
| 제4조 | 일반 TDM → 권리자 opt-out 가능 | 상업 서비스에 적용 |

관련 판례:
- Hamburg LAION 판결 (2024.9, 항소심 2025.12 확인): 비상업적 데이터셋 구축은 합법
- 상업적 사용 시 출판사가 opt-out하면 해당 데이터 사용 불가

EU 대응: 제4조 opt-out 메커니즘 대응 프로세스 마련 필요.

### 6.4 AI 생성 콘텐츠의 저작권

**Input 측: 초록을 LLM에 넣는 것이 합법인가?**
- 미국: Fair Use "변환적 목적"으로 방어 가능
- 한국: 저작권법 제35조의5 "정보분석을 위한 복제" 조항으로 방어 가능
- 대응: 초록 원문을 그대로 출력하지 않고, 분석/재구성 형태로만 제공

**Output 측: AI 생성 요약의 저작권은?**
- 대부분 국가에서 AI 생성물의 저작권 불확실
- Deepen이 서비스로 제공하는 것은 문제없음
- 사용자 재배포 시 이용약관에서 규정 필요

### 6.5 6-Layer 레이어별 법적 리스크

| 레이어 | 데이터 소스 | 법적 리스크 |
|--------|-----------|-----------|
| Prior Work | 인용 그래프 (사실 데이터) | 없음 |
| Key Concepts | OpenAlex 개념 태그 + AI 설명 | 낮음 |
| Pipeline | 초록 기반 AI 방법론 분석 | 중간 — 원문 표현 복사 주의 |
| Follow-ups | 인용 그래프 (사실 데이터) | 없음 |
| Industry Use | AI가 공개 정보 기반 생성 | 낮음 |
| Open Questions | AI가 분석 후 생성 | 낮음 — 새로운 창작 |

### 6.6 데이터 보호 / 개인정보

| 항목 | 적용 법률 | 대응 |
|------|----------|------|
| 사용자 이메일, 학습 기록 | 개인정보보호법, GDPR | 개인정보 처리방침 필수, 수집 최소화 |
| 논문 저자 이름 | 공개 정보 | 문제 없음 |
| 사용자 검색/읽기 이력 | 행태정보 → 동의 필요 | 서비스 이용약관에 명시 |

### 6.7 경쟁 서비스 법적 대응 참고

| 서비스 | 하는 일 | 법적 전략 |
|--------|---------|----------|
| Elicit | 논문 초록 AI 요약/추출 | 초록만 사용, 원문 링크 제공, PDF 미호스팅, PBC 법인 |
| Consensus | 논문 기반 AI 답변 | OpenAlex + S2 사용, 출처 명시 |
| Connected Papers | 인용 그래프 시각화 | 메타데이터만 사용 |
| ResearchRabbit | 논문 추천 + 관계 | 메타데이터 기반, 본문 미접근 |

> 공통 패턴: 모든 서비스가 "초록 + 메타데이터"만 사용, 본문에 손대지 않음. 학술 출판사가 이들 서비스를 소송한 사례 없음.

---

## 7. 유료화 전략 및 법적 안전성

### 7.1 유료화의 합법성

| 행위 | 합법 여부 | 근거 |
|------|----------|------|
| 논문 메타데이터를 유료 서비스에서 표시 | **합법** | 사실 정보, 모든 유료 서비스가 동일하게 운영 |
| 논문 큐레이션/추천에 과금 | **합법** | Connected Papers, Litmaps 등 이미 과금 중 |
| AI 분석/설명에 과금 | **합법** | Elicit, Consensus가 수백만 달러 ARR 달성 중 |
| 초록을 유료 서비스에서 표시 | **조건부** | CC0/오픈액세스 초록만 사용 |
| 여러 논문 종합 → 새 지식/로드맵 | **합법** | 변환적 사용, 원문 대체가 아닌 새 가치 창출 |

핵심 구분:
```
❌ 불법 위험: "이 논문의 내용을 보려면 결제하세요" → 출판사 시장 대체
✅ 합법:     "AI 6-Layer 분석을 보려면 결제하세요" → 독자적 분석 도구에 과금
```

### 7.2 유료화 시 추가 리스크

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| Fair Use 요소 ① 약화 (상업 목적) | 중간 | 나머지 3요소로 보완 가능 |
| Semantic Scholar API 약관 위반 | **높음** | 유료 기능에서 제외, OpenAlex로 전환 |
| 출판사 DMCA 요청 | 낮음 | 초록 원문 최소화, takedown 프로세스 마련 |

### 7.3 추천 가격 모델

| 티어 | 가격 | 포함 기능 |
|------|------|----------|
| Free | $0 | 검색 무제한, 로드맵 미리보기 (3편), 6-Layer 2편/월 |
| Pro | $12/월 ($120/년) | 6-Layer 무제한, 전체 로드맵, 학습 추적, 다국어 |
| Teams | $10/seat/월 (최소 5명) | Pro + 팀 협업/대시보드 |
| Enterprise | 문의 | 사이트 라이선스, SSO, API, 전담 지원 |

### 7.4 확장 단계

```
Phase 1 (0~6개월): B2C 프리미엄
  목표: 무료 사용자 확보 → 유료 전환 (3~5%)
  채널: 학술 커뮤니티, X/Twitter, Reddit
  예시: 100K 무료 → 3K~5K 유료 → $36K~$60K MRR

Phase 2 (6~12개월): B2B 기관 판매
  목표: 대학교/연구소 사이트 라이선스
  가격: 연간 $5K~$50K (규모별)
  예시: 20개 기관 × $10K = $200K ARR

Phase 3 (12~18개월): API-as-a-Product
  목표: 6-Layer 분석 엔진 API 판매
  고객: LMS, 출판사, 기업 R&D

Phase 4 (18개월+): 플랫폼화
  - 분야별 분석 플러그인 마켓플레이스
  - 학습 로드맵 완료 인증서 발급
  - 연구자 매칭/컨설팅 연결
```

### 7.5 추가 수익원

| 수익원 | 설명 |
|--------|------|
| 기관 라이선스 | 대학/연구소 연간 사이트 라이선스 |
| API 판매 | 6-Layer 엔진을 외부 서비스에 제공 |
| 학습 인증서 | 로드맵 완료 시 인증서 발급 |
| 기관 분석 리포트 | 연구 트렌드 보고서 (VC, 컨설팅펌 대상) |
| 스폰서 컬렉션 | 출판사/대학의 논문 컬렉션 홍보 |

---

## 8. 실행 체크리스트

### 반드시 해야 할 것

- [ ] OpenAlex를 메인 데이터 소스로 사용 (CC0, 상업 안전)
- [ ] 논문 원문 PDF를 자체 서버에 저장하지 않기
- [ ] 초록 표시 시 원본 출처(DOI 링크) 항상 표기
- [ ] 6-Layer 콘텐츠에 "AI가 분석한 내용입니다" 라벨 부착
- [ ] 각 레이어 하단에 원문 링크 제공
- [ ] API 호출량 로깅 및 rate limit 모니터링
- [ ] 이용약관 + 개인정보처리방침 작성
- [ ] DMCA takedown 요청 대응 프로세스 마련

### 주의할 것

- [ ] Semantic Scholar API는 유료 기능에서 사용 금지 (별도 라이선스 없이)
- [ ] arXiv 논문 중 CC-BY-NC (비상업) 라이선스 구분 처리
- [ ] EU 서비스 시 opt-out 메커니즘 대응
- [ ] 유료 전환 시 "상업적 이용" 범위 법률 자문

### 하면 안 되는 것

- [ ] 논문 PDF 직접 호스팅/배포
- [ ] 초록 전문을 대량 크롤링하여 자체 검색 서비스 운영
- [ ] Semantic Scholar 데이터를 유료 서비스에 직접 재판매
- [ ] AI 생성 콘텐츠를 "원저자의 의견"인 것처럼 표시
- [ ] 사용자 데이터를 동의 없이 제3자에 제공

---

> **면책 조항**: 이 문서는 법률 자문이 아닌 기술 설계를 위한 참고 자료입니다. 실제 서비스 출시 전 법률 전문가의 검토를 권장합니다.
