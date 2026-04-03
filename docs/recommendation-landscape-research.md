# Deepen 추천 알고리즘 리서치: 전체 랜드스케이프

> 리서치 일자: 2026-04-03
> 질문: 논문 추천 알고리즘의 현황과 Deepen 적용 전략
> 아키타입: 현황 파악 (State of the Art)
> 참조 소스: 15건

---

## Executive Summary

논문 추천 시스템은 Content-Based, Collaborative Filtering, Graph-Based, Hybrid 4가지 축으로 발전해왔으며, 2024-2025년 기준 **Hybrid(그래프 + 임베딩 + LLM)** 접근이 대세다. Deepen MVP에서는 Semantic Scholar API의 citation intent 데이터와 SPECTER2 임베딩을 조합하면, 자체 ML 인프라 없이도 6레이어 차별화 추천이 가능하다. 장기적으로는 GraphSAGE 기반 inductive 임베딩 + 유저 인터랙션 collaborative signal로 확장한다.

---

## 1. 추천 알고리즘 주요 접근법

### 1.1 전통적 방법

| 접근법 | 원리 | 장점 | 단점 |
|--------|------|------|------|
| **Content-Based Filtering** | 논문 텍스트/메타데이터 유사도 | Cold-start 없음 (텍스트만 있으면 됨) | 필터 버블, 우연적 발견 어려움 |
| **Collaborative Filtering** | "이 논문을 읽은 사람이 읽은 논문" | 예상치 못한 추천 가능 | 심각한 cold-start, 데이터 희소성 |
| **Knowledge-Based** | 온톨로지/분류 체계 기반 매칭 | 높은 정밀도, 설명 가능 | 지식 베이스 구축 비용 큼 |

### 1.2 현대적 방법

| 접근법 | 원리 | 대표 기술 |
|--------|------|----------|
| **Deep Learning** | 신경망으로 유저-아이템 패턴 학습 | Autoencoder, Transformer |
| **Graph Neural Networks** | 인용/공저 그래프 구조 학습 | GraphSAGE, GAT, GCN |
| **LLM-Enhanced** | 대규모 언어모델로 추천 보강 | RAG 기반 re-ranking, 지식 추출 |
| **Hybrid** | 위 방법들의 조합 | SPECTER2 + Citation Graph + CF |

**2024 서베이 트렌드**: 단일 접근법보다 Hybrid가 대세이며, 공정성(fairness)과 설명가능성(explainability)이 새로운 평가 축으로 부상 [1].

Sources: [Comprehensive Review of Recommender Systems (2024)](https://arxiv.org/abs/2407.13699)

---

## 2. Citation Graph 기반 추천

### 2.1 그래프 분석 방법론 비교

| 방법 | 원리 | 특징 |
|------|------|------|
| **Direct Citation** | A → B 직접 인용 관계 | 가장 단순하지만 정확도 낮음 |
| **Co-citation** | A, B가 동시에 인용됨 | Research front(최신 연구 전선) 포착에 우수 |
| **Bibliographic Coupling** | A, B가 같은 논문을 인용 | Intellectual base(지적 기반) 포착에 우수 |
| **Personalized PageRank** | Random walk with restart | 다중 hop 관계 포착, 확장성 좋음 |

Boyack & Klavans(2010)에 따르면, bibliographic coupling이 co-citation과 direct citation보다 약간 더 정확하며, direct citation이 가장 부정확 [2].

### 2.2 GNN 접근법 비교

| 모델 | 특징 | 새 논문 처리 | 성능 (MRR) |
|------|------|:----------:|:----------:|
| **Node2Vec** | Biased random walk, p/q 파라미터 | 불가 (전체 재학습) | - |
| **GraphSAGE** | Inductive, 이웃 집계 함수 학습 | **가능** | 0.96 |
| **GAT** | Attention으로 이웃 가중치 학습 | 가능 | 0.952 |
| **TGN-TRec** | 시간적 GNN, 동적 인용 변화 반영 | 가능 | **0.975** |

**핵심 인사이트**: GraphSAGE는 inductive learning이 가능하여 새로 등록되는 논문에 대해 재학습 없이 임베딩 생성 가능 → 동적 논문 DB에 적합 [3].

Sources: [TGN-TRec (2024)](https://arxiv.org/html/2408.15371)

---

## 3. 논문 임베딩 기법 현황

### 3.1 모델 비교

| 모델 | 차원 | 학습 데이터 | SciRepEval 점수 | 비용 | 비고 |
|------|:----:|-----------|:--------------:|------|------|
| **SPECTER2** | 768 | 6M citation triplets, 23개 학문 분야 | **71.1** | 무료 (self-hosted) | Task-specific 어댑터 지원 |
| SPECTER v1 | 768 | 600K triplets | 67.5 | 무료 | 이전 버전, 여전히 S2 API에서 제공 |
| SciNCL | 768 | Citation neighborhoods | 68.8 | 무료 | SPECTER2에 의해 대체됨 |
| SciBERT | 768 | 1.14M 과학 논문 | - | 무료 | 유사도용 아닌 분류용 base 모델 |
| OpenAI text-embedding-3-large | 3072 | 범용 | MTEB 상위 | ~$0.13/M tokens | 도메인 비특화 |
| all-MiniLM-L6-v2 | 384 | 1.17B sentence pairs | - | 무료 | 너무 경량, 논문용 부적합 |

### 3.2 SPECTER2 상세

- SciBERT를 base로 citation contrastive learning
- **어댑터 시스템**: proximity(검색/유사도), adhoc query, classification, regression 4종
- 논문 추천에는 `allenai/specter2` (proximity 어댑터) 사용
- 입력: title + abstract (max 512 tokens) → 768차원 벡터
- Apache 2.0 오픈소스, HuggingFace에서 바로 사용 가능

### 3.3 Deepen에 대한 추천

- **MVP**: Semantic Scholar API의 pre-computed SPECTER 임베딩 활용 (자체 GPU 불필요)
- **Phase 2**: SPECTER2 self-hosted로 전환 (커스텀 어댑터 가능)
- **한국어 논문**: multilingual-e5-large 또는 BGE-m3 고려 필요

Sources: [SPECTER2 (Allen AI)](https://allenai.org/blog/specter2-adapting-scientific-document-embeddings-to-multiple-fields-and-task-formats-c95686c06567), [SPECTER2 HuggingFace](https://huggingface.co/allenai/specter2)

---

## 4. 실제 서비스 분석

| 서비스 | 추천 방식 | 데이터 소스 | 탐색 모드 | Deepen 대비 |
|--------|----------|-----------|----------|------------|
| **Semantic Scholar** | SPECTER 임베딩 + TF-IDF + SVM re-ranking | 자체 코퍼스 (~200M) | 단일 추천 리스트 | 레이어 구분 없음 |
| **Connected Papers** | Co-citation + bibliographic coupling 그래프 | Semantic Scholar | 시각적 그래프 (~40-50 논문) | 방향 구분 없음 |
| **ResearchRabbit** | Citation network + 시맨틱 유사도 | S2 + OpenAlex + PubMed | Earlier / Later / Similar (3가지) | 6가지 대비 제한적 |
| **Elicit** | LLM 시맨틱 검색 + 구조화 데이터 추출 | 자체 인덱스 | 자연어 질문 기반 | 구조적 그래프 탐색 없음 |
| **Litmaps** | 직접 인용 체인 + 시간 시각화 | CrossRef + S2 | 타임라인 기반 | 시맨틱 유사도 부재 |
| **Inciteful** | PageRank + 최단경로 분석 | 인용 그래프 | Graph centrality 기반 | 컨텐츠 이해 부재 |

### Semantic Scholar 추천 파이프라인 상세 [4]

1. **Ranker Training**: TF-IDF + SPECTER 임베딩으로 dual SVM 학습
2. **Candidate Selection**: FAISS로 최근 60일 ~1M 논문에서 후보 추출
3. **Candidate Ranking**: positive centroid 기준 ~500개 선정, averaged SVM 점수로 순위
4. **Personalization**: 유저가 제공한 positive/negative 논문으로 개인화

Sources: [S2 Open Data Platform](https://arxiv.org/html/2301.10140v2), [ResearchRabbit (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10403115/)

---

## 5. LLM 기반 추천 시스템

### 5.1 LLM 활용 패러다임

| 패러다임 | 방식 | 장점 | 비용/지연 |
|---------|------|------|----------|
| **Feature Extractor** | LLM으로 텍스트 피처 추출 → 전통 모델에 입력 | 낮은 위험, 높은 호환성 | 오프라인 처리, 저비용 |
| **Scorer/Ranker** | LLM이 후보 논문 직접 점수 매김 | 뉘앙스 이해, 제로샷 가능 | $0.01-0.10/요청, 1-10초 |
| **Conversational** | 대화형 추천 (연구 관심사 묘사 → 추천) | 자연어 입력, 높은 UX | 실시간 비용 높음 |
| **RAG 기반** | 검색(dense retrieval) → LLM re-rank/설명 | 최신 논문 접근 + 설명 가능 | 중간 (검색은 저비용) |

### 5.2 핵심 인사이트

- LLM을 **추론 시점(inference)에 직접 사용하면 비용/지연 감당 불가** → 오프라인 지식 추출 후 전통 모델에 주입하는 방식이 현실적 [5]
- **Cold-start에서 LLM이 강점**: 인터랙션 데이터 없이도 텍스트 메타데이터만으로 추천 가능
- **RAG가 논문 추천에 가장 현실적**: SPECTER2로 후보 검색 → LLM으로 re-rank + 추천 이유 생성
- Distillation 트렌드: LLM의 추천 지식을 경량 모델로 증류하여 배포

Sources: [LLM Enhanced RecSys Survey](https://arxiv.org/abs/2412.13432), [LLM-powered Agents for RecSys](https://arxiv.org/abs/2502.10050)

---

## 6. Cold-Start 및 실용 구현

### 6.1 Cold-Start 해결 전략

| 문제 | 해결책 | Deepen 적용 |
|------|--------|------------|
| **새 유저** | 온보딩에서 seed 논문 3-5개 선택 요청 | S2 `/recommendations`에 seed로 입력 |
| **새 유저 (보완)** | ORCID/Google Scholar 프로필 가져오기 | 저자의 기존 논문을 관심사로 활용 |
| **새 논문** | SPECTER2로 title+abstract 임베딩 생성 | 인용 없어도 content similarity 계산 가능 |
| **새 논문 (보완)** | 저자의 기존 논문 프로필로 추론 | 저자 네트워크 활용 |
| **세션 기반** | 현재 세션에서 본 논문 기반 실시간 추천 | 탐색 중인 논문들을 implicit signal로 활용 |

### 6.2 데이터 소스 API 비교

| | Semantic Scholar | OpenAlex | CrossRef |
|--|:---------------:|:--------:|:--------:|
| **논문 수** | ~200M+ | 250M+ | ~150M+ |
| **Rate limit (무료)** | 100/5분 | 100K/일 | ~50 req/s |
| **인용 데이터** | O (intent + influential) | O (기본) | O (기본) |
| **추천 API** | `/recommendations` | `search.semantic` | X |
| **임베딩** | SPECTER (pre-computed) | X | X |
| **라이선스** | 제한적 | **CC0 (완전 개방)** | 개방 |
| **벌크 다운로드** | 월간 스냅샷 (~100GB) | S3 스냅샷 (무료) | X |

### 6.3 MVP 단계별 아키텍처

```
Phase 1 (< 1K 유저): API-First
├─ Semantic Scholar API → 인용 데이터 + intent + 추천
├─ OpenAlex API → 보완 메타데이터 + 시맨틱 검색
├─ PostgreSQL → 캐시 + 유저 데이터
└─ ML 인프라 불필요

Phase 2 (1K-50K 유저): 하이브리드
├─ OpenAlex 벌크 데이터 → 자체 인덱스 구축
├─ SPECTER2 self-hosted → 커스텀 임베딩
├─ pgvector → 벡터 유사도 검색
└─ 유저 인터랙션 로깅 시작

Phase 3 (50K+ 유저): Full ML
├─ GraphSAGE → inductive 논문 임베딩
├─ Collaborative Filtering → 유저 행동 기반 추천
├─ RAG + LLM → 추천 이유 생성
└─ 전용 ML serving 인프라
```

---

## 7. Deepen 종합 전략

### 핵심 차별점

> **"어떤 논문이 추천되는가"가 아닌, "왜, 어떤 관점에서 추천되는가"를 6레이어로 구조화**

| 기존 서비스 | Deepen |
|-----------|--------|
| 단일 추천 리스트 | 6가지 지식 방향별 분리 추천 |
| 인용 방향 최대 3종 (earlier/later/similar) | 6레이어: Prior Work / Key Concepts / Pipeline / Follow-ups / Industry Use / Open Questions |
| "왜 추천?" 설명 없음 | 인용 intent(background/method/result) 기반 설명 제공 |

### 기술 스택 요약

| 컴포넌트 | MVP 선택 | 이유 |
|---------|---------|------|
| 데이터 소스 | Semantic Scholar API (주) + OpenAlex (보완) | Intent 데이터 + 넉넉한 rate limit |
| 임베딩 | S2 pre-computed SPECTER | GPU 인프라 불필요 |
| 유사도 검색 | S2 `/recommendations` + OpenAlex `search.semantic` | 자체 벡터 DB 불필요 |
| 레이어 분류 | Citation intent 필터 + 방향 + venue 필터 | 별도 ML 모델 불필요 |
| 저장소 | PostgreSQL | 캐시 + 유저 데이터 |

→ 상세 레이어별 매핑 설계는 [recommendation-algorithm-research.md](./recommendation-algorithm-research.md) 참조

---

## Sources

| # | 소스 | URL | 신뢰도 |
|---|------|-----|--------|
| 1 | Comprehensive Review of Recommender Systems (2024) | https://arxiv.org/abs/2407.13699 | ★★★ |
| 2 | Co-citation vs Bibliographic Coupling (Boyack & Klavans 2010) | https://onlinelibrary.wiley.com/doi/10.1002/asi.21419 | ★★★ |
| 3 | TGN-TRec: Temporal GNN Paper Recommendation (2024) | https://arxiv.org/html/2408.15371 | ★★★ |
| 4 | Semantic Scholar Open Data Platform | https://arxiv.org/html/2301.10140v2 | ★★★ |
| 5 | LLM Enhanced Recommender Systems Survey | https://arxiv.org/abs/2412.13432 | ★★★ |
| 6 | SPECTER2 (Allen AI) | https://allenai.org/blog/specter2 | ★★★ |
| 7 | SPECTER2 HuggingFace Model Card | https://huggingface.co/allenai/specter2 | ★★★ |
| 8 | ResearchRabbit Review (PMC) | https://pmc.ncbi.nlm.nih.gov/articles/PMC10403115/ | ★★☆ |
| 9 | OpenAlex Semantic Search Docs | https://developers.openalex.org/how-to-use-the-api/find-similar-works | ★★★ |
| 10 | LLM-powered Agents for RecSys (EMNLP 2025) | https://arxiv.org/abs/2502.10050 | ★★★ |
| 11 | Citation Intent Classification (AI2 Blog) | https://medium.com/ai2-blog/citation-intent-classification-bd2bd47559de | ★★★ |
| 12 | SciCite (NAACL 2019) | https://aclanthology.org/N19-1361.pdf | ★★★ |
| 13 | Citation Function Classification Survey (2024) | https://www.sciencedirect.com/science/article/pii/S1751157724001202 | ★★★ |
| 14 | OpenAlex API Rate Limits | https://docs.openalex.org/how-to-use-the-api/rate-limits-and-authentication | ★★★ |
| 15 | Deep Learning in Recommender Systems Survey (2024) | https://link.springer.com/article/10.1007/s00521-024-10866-z | ★★★ |
