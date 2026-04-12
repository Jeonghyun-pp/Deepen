# Deepen — 논문 키워드 추출 파이프라인

OpenAlex에서 논문을 수집하고, Upstage Solar API로 키워드를 추출하여 DB화하는 Python 백엔드입니다.
Next.js 앱(Deepen)에서 FastAPI를 통해 호출할 수 있습니다.

---

## 최종 목표

```
[OpenAlex API]
     │  주기적 대량 수집
     ▼
[LangGraph 파이프라인]  ←  Upstage Solar API (LLM)
     │  논문 유형 분류 → L1~L6 구조화 키워드 추출
     ▼
[Database]  ←─────────────────────────────  Next.js app (조회)
```

1. OpenAlex에서 분야별·연도별 논문을 주기적으로 수집
2. LangGraph로 논문 유형을 분류하고 L1~L6 구조화 키워드 추출
3. DB에 저장 (추후 연동)
4. Deepen Next.js 앱에서 FastAPI를 통해 실시간 조회

---

## 디렉토리 구조

```
pipeline/
├── api.py                  FastAPI 서버 — Next.js 앱에서 HTTP로 호출하는 진입점
├── main.py                 CLI 진입점 — 터미널에서 직접 실행할 때 사용
├── requirements.txt        Python 패키지 목록
├── .env                    API 키 설정 (git 제외)
├── .env.example            .env 작성 가이드
│
├── models/
│   └── paper.py            데이터 모델 — Pydantic 기반
│                             · Paper                   논문 원본
│                             · StructuredKeywordResult L1~L6 구조화 결과
│
├── clients/
│   ├── openalex.py         OpenAlex API 클라이언트
│   │                         · fetch_paper(id)
│   │                         · search_papers(query)
│   └── solar.py            Upstage Solar API 클라이언트
│                             · call_json(system, user) → dict
│
├── extractors/
│   └── structured_keyword.py LangGraph 기반 구조화 추출 오케스트레이터
│                               · from_paper / from_id / from_search
│
└── graphs/
    └── keyword_extraction/
        ├── state.py        ExtractionState TypedDict (LangGraph 상태)
        ├── nodes.py        classify 노드 + extract_all 노드
        ├── graph.py        StateGraph 정의 및 싱글턴 컴파일
        └── prompts/        논문 유형별 프롬프트 파일 (SYSTEM + USER)
            ├── classify.py     유형 분류 프롬프트
            ├── applied.py      Applied 전용 L1~L6 통합 프롬프트
            ├── theoretical.py  Theoretical 전용 L1~L6 통합 프롬프트
            ├── survey.py       Survey 전용 L1~L6 통합 프롬프트
            └── tools.py        Tools 전용 L1~L6 통합 프롬프트
```

---

## 빠른 시작

### 1. 설치

```bash
cd pipeline
pip install -r requirements.txt
cp .env.example .env   # 이후 .env에 API 키 입력
```

### 2. `.env` 설정

```
UPSTAGE_API_KEY=your_upstage_api_key   # 필수
OPENALEX_EMAIL=your@email.com          # 선택 (권장)
```

### 3-A. CLI로 실행

```bash
# 단건 (OpenAlex Work ID)
python main.py id W2741809807

# 검색어로 10편 일괄 추출
python main.py search "diffusion model" --count 10

# 연도 범위 + 파일 저장
python main.py search "RLHF" --count 20 --year-from 2021 -o results.json
```

### 3-B. FastAPI 서버로 실행

```bash
uvicorn api:app --reload --port 8000
```

API 문서: http://localhost:8000/docs

---

## LangGraph 키워드 추출 구조

논문 한 편이 그래프를 통과하는 흐름:

```
START
  │
  ▼
[classify]       제목+초록 → Applied / Theoretical / Survey / Tools 분류
  │                          (LLM 호출 1회)
  ▼
[extract_all]    유형 전용 프롬프트로 L1~L6 키워드를 한 번에 추출
  │                          (LLM 호출 1회)
  ▼
END  →  StructuredKeywordResult
```

**총 LLM 호출: 2회 / 논문당**

논문 유형이 확정된 뒤 해당 유형 전용 프롬프트만 사용하므로,
프롬프트 안에 조건 분기가 없고 abstract를 2번만 전송합니다.

---

## 레이어 구조 (L1~L6)

각 레이어는 논문을 다른 각도로 분석합니다:

| Layer    | Tag    | 분석 관점                          |
|----------|--------|------------------------------------|
| L1       | #계보  | 이 논문이 기반으로 하는 선행 연구  |
| L2       | #원리  | 핵심 작동 원리·이론적 토대         |
| L3       | #과정  | 구체적 절차·구현·실험 설계         |
| L4       | #제안  | 이 논문의 기여·확장 방향           |
| L5       | #필드  | 적용 분야·파급력                   |
| L6       | #한계  | 제약·연구 공백·미해결 문제         |

논문 유형별 추출 초점:

| Layer    | Applied (실험/응용)       | Theoretical (이론/기초)    | Survey (리뷰/서베이)       | Tools (데이터/방법론)      |
|----------|--------------------------|---------------------------|---------------------------|---------------------------|
| L1 #계보 | 기반 모델, 비교 알고리즘  | 고전 공리, 학파            | 연도별 흐름, 마일스톤      | 유사 데이터셋, 설계 철학   |
| L2 #원리 | 최적화 논리, 손실함수     | 수리적 전제, 핵심 가정     | Taxonomy, 분류 기준        | 시스템 구조, 메커니즘      |
| L3 #과정 | 실험 설계, 알고리즘 구현  | 증명 유도, 보조정리        | 논문 선정 기준, 통계       | 데이터 정제, 단계별 가이드 |
| L4 #제안 | 도메인 확장, 결합 모델    | 일반화 정리, 고차원 확장   | 향후 로드맵, 트렌드        | 데이터 확장성, 범용화      |
| L5 #필드 | 적용 산업, 성능 수치      | 응용 학문, 수치 안정성     | 도메인 파급력              | 활용 가능 연구             |
| L6 #한계 | 데이터 편향, 연산 부하    | 증명 조건 제약             | 기존 연구 간극 (Gap)       | 데이터 노이즈, 인프라 제약 |

---

## 프롬프트 수정 방법

각 유형의 프롬프트는 `graphs/keyword_extraction/prompts/` 아래 파일로 관리됩니다.
각 파일은 `SYSTEM`(지시문)과 `USER`(입력 템플릿) 두 상수로 구성됩니다.

```python
# applied.py 예시
SYSTEM = """..."""  # L1~L6 추출 지시 (Applied 전용)
USER   = """Title: {TITLE}\n\nAbstract: {ABSTRACT}"""
```

- **프롬프트 내용 수정** → 해당 유형 파일의 `SYSTEM` 편집
- **입력 형식 수정** → `USER` 편집
- **새 유형 추가** → 새 `.py` 파일 생성 후 `nodes.py`의 `PROMPT_MAP`에 등록

---

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| `GET`  | `/health` | 서버 상태 확인 |
| `POST` | `/extract/id` | OpenAlex ID로 단건 구조화 추출 (L1~L6) |
| `POST` | `/extract/search` | 검색어로 일괄 구조화 추출 (L1~L6) |

### `POST /extract/structured/id` 응답 예시

```json
{
  "paper_id": "W2741809807",
  "title": "Attention Is All You Need",
  "year": 2017,
  "paper_type": "Applied",
  "l1": ["RNN", "LSTM", "seq2seq"],
  "l2": ["self-attention", "scaled dot-product", "positional encoding"],
  "l3": ["multi-head attention", "encoder-decoder", "beam search"],
  "l4": ["transformer architecture", "parallelizable training"],
  "l5": ["machine translation", "NLP", "BLEU score improvement"],
  "l6": ["quadratic memory complexity", "fixed context length"]
}
```

---

## Next.js 앱에서 호출하는 방법

```typescript
// app/api/keywords/route.ts
export async function POST(req: Request) {
  const body = await req.json();
  const res = await fetch("http://localhost:8000/extract/structured/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return Response.json(await res.json());
}
```

---

## 향후 확장 계획

- [ ] DB 연동 (Supabase / PostgreSQL) — 추출 결과 영속화
- [ ] 주기적 배치 수집 스케줄러 (APScheduler 또는 cron)
- [ ] 중복 논문 스킵 로직 (OpenAlex ID 기준)
- [ ] 분야별 시드 쿼리 목록 관리
