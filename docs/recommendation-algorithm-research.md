# Deepen 추천 알고리즘: Citation Graph + 6레이어 매핑 설계

> 리서치 일자: 2026-04-03
> 질문: Deepen의 6가지 지식 레이어에 인용 그래프 기반 추천을 어떻게 매핑할 것인가?
> 리서치 라운드: 2 (탐색 + 심층)
> 참조 소스: 15건

---

## Executive Summary

Deepen의 6가지 지식 레이어(Prior Work, Key Concepts, Pipeline, Follow-ups, Industry Use, Open Questions)는 각각 **인용 그래프의 서로 다른 방향과 관계 유형**에 자연스럽게 매핑된다. Semantic Scholar API가 제공하는 **citation intent(Background/Method/Result)** + **isInfluential** 플래그를 활용하면, 별도 ML 모델 없이도 MVP 단계에서 레이어별 차별화된 추천이 가능하다. 핵심 인사이트는: 단일 추천 알고리즘이 아닌, **레이어별로 다른 그래프 순회 전략 + 필터링 규칙**을 조합하는 것이 Deepen만의 차별점이 된다는 것이다.

## Key Findings

| # | 발견 사항 | 신뢰도 | 출처 |
|---|----------|--------|------|
| 1 | Semantic Scholar API는 각 인용 링크에 intent(background/method/result) + isInfluential + context 텍스트를 제공 | confirmed | [1][2] |
| 2 | Citation intent 3분류(Background/Method/Result)는 Deepen의 6레이어 중 3개에 직접 매핑 가능 | confirmed | [1][3] |
| 3 | 인용 방향(forward/backward)만으로도 Prior Work vs Follow-ups 분리가 자연스러움 | confirmed | [4][5] |
| 4 | Co-citation은 research front(최신 연구 전선)를, bibliographic coupling은 intellectual base(지적 기반)를 더 잘 포착 | confirmed | [5][6] |
| 5 | GraphSAGE는 inductive 학습이 가능하여 새 논문에 대한 임베딩 생성 가능, Node2Vec은 불가 | confirmed | [7][8] |
| 6 | TGN-TRec(시간적 GNN)이 정적 모델 대비 MRR 0.975로 우수 (GraphSAGE 0.96) | confirmed | [8] |
| 7 | Semantic Scholar 추천 시스템은 TF-IDF + SPECTER 임베딩 + FAISS + Linear SVM 파이프라인 사용 | confirmed | [2] |

---

## 1. Semantic Scholar API의 Citation 데이터 구조

Semantic Scholar는 각 인용 링크에 대해 다음 데이터를 제공한다 [1][2]:

```
GET /graph/v1/paper/{paperId}/citations?fields=intents,isInfluential,contexts
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `intents` | `string[]` | `["background"]`, `["methodology"]`, `["result"]` 또는 조합 |
| `isInfluential` | `boolean` | 인용이 실질적 영향을 끼쳤는지 (method/result 확장 여부) |
| `contexts` | `string[]` | 인용이 등장하는 실제 문장들 |
| `citingPaper` / `citedPaper` | `object` | 인용하는/받는 논문 메타데이터 |

### Citation Intent 분류 기준 (SciCite 모델) [1][3]

| Intent | 정의 | 예시 |
|--------|------|------|
| **Background** | 역사적 맥락, 중요성 정당화, 관련 정보 제공 | "이전 연구[X]에 따르면..." |
| **Method** | 기존 절차/실험/도구를 사용 | "우리는 [X]의 프레임워크를 사용하여..." |
| **Result** | 기존 연구 결과를 확장/비교 | "[X]의 결과와 비교하면..." |

---

## 2. 6레이어 × Citation Graph 매핑 설계

### 매핑 전략

```
                    ┌─ Background intent ──→ Prior Work
                    │
   Backward refs ───┼─ Method intent ──────→ Pipeline (Key Concepts)
   (이 논문이        │
    인용한 것)       └─ All + co-citation ──→ Key Concepts
                    
                    ┌─ isInfluential=true ──→ Follow-ups (핵심 후속)
                    │
   Forward cites ───┼─ Method intent ──────→ Pipeline (발전된 기법)
   (이 논문을        │
    인용한 것)       └─ Result intent ──────→ Follow-ups
                    
   Venue/affil ─────── Industry venue ─────→ Industry Use
   filter             (특허, 산업 학회 등)
   
   Temporal +          Low-density frontier ──→ Open Questions
   gap analysis        (인용 드문 최신 영역)
```

### 레이어별 상세 알고리즘

#### Layer 1: Prior Work (선행 연구)

**목표**: 이 논문이 기반한 핵심 배경 논문 발견

| 항목 | 설계 |
|------|------|
| 그래프 방향 | **Backward** (이 논문이 인용한 논문들) |
| 필터 | `intents` contains `"background"` |
| 정렬 | `isInfluential=true` 우선 → `citationCount` 내림차순 |
| 확장 | 1-hop backward에서 co-citation 분석: "이 논문과 함께 자주 인용되는 논문" 추가 |
| 데이터 | `GET /paper/{id}/references?fields=intents,isInfluential,citedPaper.citationCount` |

**스코어링**:
```
Score = 0.4 × isInfluential + 0.3 × intentMatch("background") + 0.3 × log(citationCount)
```

#### Layer 2: Key Concepts (핵심 개념)

**목표**: 같은 핵심 개념/이론을 다루는 논문 발견

| 항목 | 설계 |
|------|------|
| 그래프 방향 | **양방향** — co-citation + bibliographic coupling |
| 핵심 알고리즘 | Co-citation: 이 논문과 함께 자주 인용되는 논문 쌍 [5] |
| 보완 | SPECTER2 임베딩 코사인 유사도 상위 논문 (content similarity) |
| 필터 | `intents` contains `"background"` OR `"methodology"` |
| 데이터 | Semantic Scholar `/recommendations` 엔드포인트 + co-citation 수동 계산 |

**스코어링**:
```
Score = 0.4 × cosCitationSimilarity + 0.3 × specter2Similarity + 0.3 × bibliographicCoupling
```

**co-citation 계산**: 
논문 A와 B의 co-citation 강도 = |{A와 B를 동시에 인용하는 논문 집합}|

#### Layer 3: Pipeline (방법론/파이프라인)

**목표**: 동일하거나 유사한 방법론/기법을 사용하는 논문 발견

| 항목 | 설계 |
|------|------|
| 그래프 방향 | **Backward** (이 논문이 method로 인용한 것) + **Forward** (이 논문의 method를 인용한 것) |
| 핵심 필터 | `intents` contains `"methodology"` |
| 정렬 | `isInfluential=true` 우선 |
| 확장 | 2-hop: "이 논문이 method로 인용한 논문"이 또 method로 인용한 논문 (기법의 원류 추적) |
| 데이터 | References + Citations 양쪽에서 method intent 필터링 |

**스코어링**:
```
Score = 0.5 × intentMatch("methodology") + 0.3 × isInfluential + 0.2 × recencyBoost
```

#### Layer 4: Follow-ups (후속 연구)

**목표**: 이 논문의 결과를 발전시킨 후속 연구 발견

| 항목 | 설계 |
|------|------|
| 그래프 방향 | **Forward** (이 논문을 인용한 논문들) |
| 핵심 필터 | `isInfluential=true` AND (`intents` contains `"result"` OR `"methodology"`) |
| 정렬 | 최신순(recency) + influential 우선 |
| 제외 | `intents`가 `"background"` only인 것은 제외 (단순 언급은 후속 연구가 아님) |
| 확장 | Temporal weighting — 최근 2년 논문에 가중치 |

**스코어링**:
```
Score = 0.3 × isInfluential + 0.3 × intentMatch("result") + 0.4 × recencyScore
```

`recencyScore = 1 / (1 + yearsSincePublication)`

#### Layer 5: Industry Use (산업 적용)

**목표**: 이 연구의 실제 산업/실무 적용 사례 발견

| 항목 | 설계 |
|------|------|
| 그래프 방향 | **Forward** (이 논문을 인용한 것) + 특허 인용 |
| 핵심 필터 | venue 유형 필터링: industry conference, applied journal, patent |
| Venue 분류 | Semantic Scholar의 `venue` 필드 + OpenAlex의 `type` 필드로 필터 |
| 보완 | 저자 소속(affiliation)이 기업인 논문 가중치 부여 |
| 데이터 | `GET /paper/{id}/citations` + venue/author affiliation 메타데이터 |

**Venue 분류 규칙** (수동 관리 리스트):
```
INDUSTRY_VENUES = [
  "NeurIPS (Industry Track)", "KDD (Applied Data Science)", 
  "AAAI (AI in Practice)", "IEEE Industry Applications", ...
]
INDUSTRY_AFFILIATIONS = ["Google", "Microsoft", "Meta", "Samsung", ...]
```

**스코어링**:
```
Score = 0.4 × isIndustryVenue + 0.3 × isIndustryAuthor + 0.2 × isInfluential + 0.1 × recency
```

#### Layer 6: Open Questions (미해결 질문)

**목표**: 이 논문이 열어놓은 미해결 문제와 탐색되지 않은 방향 발견

| 항목 | 설계 |
|------|------|
| 그래프 전략 | **Forward frontier** — 최신 인용 논문 중 인용 수가 적은 것 (아직 탐색 초기) |
| 핵심 로직 | Forward citations 중 `citationCount < 10` AND `year >= 2024` |
| 보완 1 | SPECTER2 유사도는 높지만 인용 관계는 없는 최신 논문 (아직 연결되지 않은 관련 연구) |
| 보완 2 | 이 논문의 abstract에서 "future work", "open question", "limitation" 키워드 추출 → 관련 논문 검색 |
| 데이터 | Citations + SPECTER2 similarity + keyword extraction |

**스코어링**:
```
Score = 0.3 × (1 - log(citationCount)/maxLog) + 0.3 × recencyScore + 0.2 × specter2Sim + 0.2 × futureWorkKeywordMatch
```

---

## 3. MVP 구현 아키텍처

### Phase 1: API-First MVP (ML 인프라 불필요)

```
User selects paper
       │
       ├─→ Semantic Scholar API: /paper/{id}/references (+ intents, isInfluential)
       │     └─→ Filter by intent → Prior Work, Key Concepts, Pipeline
       │
       ├─→ Semantic Scholar API: /paper/{id}/citations (+ intents, isInfluential)
       │     └─→ Filter by intent + venue → Follow-ups, Industry Use
       │
       ├─→ Semantic Scholar API: /recommendations (positive=[paperId])
       │     └─→ Content-similar papers → Key Concepts 보완
       │
       └─→ OpenAlex API: /works?cited_by={id}&sort=publication_date:desc
             └─→ 최신 + 저인용 논문 → Open Questions
```

### API 호출 예시 (레이어별)

```python
import requests

BASE = "https://api.semanticscholar.org/graph/v1"
PAPER_ID = "649def34f8be52c8b66281af98ae884c09aef38b"  # example

# ── Layer 1: Prior Work ──
refs = requests.get(f"{BASE}/paper/{PAPER_ID}/references", params={
    "fields": "intents,isInfluential,citedPaper.title,citedPaper.citationCount,citedPaper.year",
    "limit": 100
}).json()["data"]

prior_work = [r for r in refs if "background" in r.get("intents", [])]
prior_work.sort(key=lambda r: (r["isInfluential"], r["citedPaper"]["citationCount"]), reverse=True)

# ── Layer 3: Pipeline ──
pipeline_refs = [r for r in refs if "methodology" in r.get("intents", [])]
pipeline_cites = requests.get(f"{BASE}/paper/{PAPER_ID}/citations", params={
    "fields": "intents,isInfluential,citingPaper.title,citingPaper.year",
    "limit": 100
}).json()["data"]
pipeline_cites = [c for c in pipeline_cites if "methodology" in c.get("intents", [])]

# ── Layer 4: Follow-ups ──
all_cites = requests.get(f"{BASE}/paper/{PAPER_ID}/citations", params={
    "fields": "intents,isInfluential,citingPaper.title,citingPaper.year,citingPaper.citationCount",
    "limit": 500
}).json()["data"]

followups = [c for c in all_cites 
    if c["isInfluential"] 
    and any(i in c.get("intents", []) for i in ["result", "methodology"])]
followups.sort(key=lambda c: c["citingPaper"]["year"], reverse=True)

# ── Layer 6: Open Questions ──
open_q = [c for c in all_cites 
    if c["citingPaper"]["year"] >= 2024 
    and c["citingPaper"].get("citationCount", 0) < 10]
open_q.sort(key=lambda c: c["citingPaper"]["year"], reverse=True)
```

### Phase 2: 하이브리드 (SPECTER2 + Graph)

```
               ┌─────────────────────────────────────┐
               │        Paper Embedding Index          │
               │   (SPECTER2 vectors in pgvector)      │
               └───────────────┬─────────────────────┘
                               │ cosine similarity
   User paper ──→ S2 API ──→ ┼──→ Merge & Re-rank ──→ 6 Layers
                               │ intent/direction filter
               ┌───────────────┴─────────────────────┐
               │       Citation Graph Signals          │
               │  (S2 API: refs, cites, intents)       │
               └─────────────────────────────────────┘
```

**Merge 전략**: 각 레이어에서 graph signal과 embedding similarity를 가중 합산.
레이어별 가중치는 위 스코어링 공식 참조.

### Phase 3: GNN 기반 (스케일업)

- GraphSAGE로 논문 임베딩 학습 (inductive → 새 논문 즉시 처리 가능) [7]
- 학습 시 citation intent를 edge feature로 포함하여 방향 인식
- 유저 인터랙션 데이터로 collaborative signal 추가

---

## 4. Deepen 차별화 포인트

기존 서비스와 비교한 Deepen만의 강점:

| 서비스 | 방식 | Deepen과의 차이 |
|--------|------|----------------|
| **Connected Papers** | Co-citation 그래프 (방향 구분 없음) | Deepen은 6가지 방향별로 분리 추천 |
| **ResearchRabbit** | Earlier/Later/Similar (3가지) | Deepen은 Method/Industry/Open Q까지 6가지 |
| **Semantic Scholar** | 단일 추천 리스트 | Deepen은 "왜" 추천하는지 레이어로 설명 |
| **Elicit** | LLM 기반 자연어 검색 | Deepen은 구조적 그래프 탐색 + LLM 보완 |

**핵심 차별점**: "어떤 논문이 추천되는가"가 아닌 **"왜, 어떤 관점에서 추천되는가"** 를 6레이어로 구조화.

---

## Limitations & Caveats

- Citation intent 데이터는 Semantic Scholar가 **전문(full-text) 접근 가능한 논문에만** 제공. 전체 코퍼스의 약 30-40%로 추정 [2]
- Industry Use 레이어의 venue 분류는 수동 관리 리스트에 의존 → 지속적 업데이트 필요
- Open Questions 레이어는 본질적으로 "부재의 신호"에 기반하므로 precision이 낮을 수 있음
- Co-citation 계산은 API 호출만으로는 비용이 큼 → 배치 처리 또는 OpenAlex 벌크 데이터 필요

## Sources

| # | 소스 | URL | 접근일 | 신뢰도 |
|---|------|-----|--------|--------|
| 1 | Semantic Scholar Citation Intent (AI2 Blog) | https://medium.com/ai2-blog/citation-intent-classification-bd2bd47559de | 2026-04-03 | ★★★ |
| 2 | Semantic Scholar Open Data Platform (arXiv) | https://arxiv.org/html/2301.10140v2 | 2026-04-03 | ★★★ |
| 3 | SciCite: Structural Scaffolds for Citation Intent (NAACL 2019) | https://aclanthology.org/N19-1361.pdf | 2026-04-03 | ★★★ |
| 4 | Direction-Aware Citation Analysis (ResearchGate) | https://www.researchgate.net/publication/224907167 | 2026-04-03 | ★★★ |
| 5 | Co-citation vs Bibliographic Coupling (Boyack & Klavans 2010) | https://onlinelibrary.wiley.com/doi/10.1002/asi.21419 | 2026-04-03 | ★★★ |
| 6 | Bibliographic Coupling and Research Fronts | https://www.sciencedirect.com/science/article/abs/pii/S1751157707000594 | 2026-04-03 | ★★☆ |
| 7 | GraphSAGE (Hamilton et al., NeurIPS 2017) | 학습 데이터 기반 | - | ★★★ |
| 8 | TGN-TRec: Temporal GNN Paper Recommendation | https://arxiv.org/html/2408.15371 | 2026-04-03 | ★★★ |
| 9 | SPECTER2 (Allen AI) | https://allenai.org/blog/specter2 | 2026-04-03 | ★★★ |
| 10 | LLM Enhanced Recommender Systems Survey | https://arxiv.org/abs/2412.13432 | 2026-04-03 | ★★★ |
| 11 | ResearchRabbit Review (PMC) | https://pmc.ncbi.nlm.nih.gov/articles/PMC10403115/ | 2026-04-03 | ★★☆ |
| 12 | OpenAlex Semantic Search Docs | https://developers.openalex.org/how-to-use-the-api/find-similar-works | 2026-04-03 | ★★★ |
| 13 | Citation Function Classification Survey (2024) | https://www.sciencedirect.com/science/article/pii/S1751157724001202 | 2026-04-03 | ★★★ |
| 14 | LLMs in Citation Intent Classification (MIT) | http://dspace.mit.edu/bitstream/handle/1721.1/164071/3736731.3746137.pdf | 2026-04-03 | ★★★ |
| 15 | Comprehensive Review of Recommender Systems (2024) | https://arxiv.org/abs/2407.13699 | 2026-04-03 | ★★★ |
