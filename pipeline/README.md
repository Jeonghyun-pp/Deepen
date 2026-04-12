# Deepen — 논문 키워드 추출 파이프라인

OpenAlex에서 논문을 수집하고, Upstage Solar API로 키워드를 추출하여 DB화하는 Python 백엔드입니다.
Next.js 앱(Deepen)에서 FastAPI를 통해 호출할 수 있습니다.

---

## 최종 목표

```
[OpenAlex API]
     │  주기적 대량 수집
     ▼
[keyword extractor]  ←  Upstage Solar API (LLM)
     │  keywords / methods / concepts
     ▼
[Database]  ←─────────────────────────────  Next.js app (조회)
```

1. OpenAlex에서 분야별·연도별 논문을 주기적으로 수집
2. Solar API로 각 논문의 키워드 / 방법론 / 개념 추출
3. DB에 저장 (추후 연동)
4. Deepen Next.js 앱에서 FastAPI를 통해 실시간 조회

---

## 디렉토리 구조

```
pipeline/
├── api.py              FastAPI 서버 — Next.js 앱에서 HTTP로 호출하는 진입점
├── main.py             CLI 진입점 — 터미널에서 직접 실행할 때 사용
├── requirements.txt    Python 패키지 목록
├── .env                API 키 설정 (git 제외)
├── .env.example        .env 작성 가이드
│
├── models/
│   └── paper.py        데이터 모델 (Paper, KeywordResult) — Pydantic 기반
│
├── clients/
│   ├── openalex.py     OpenAlex API 클라이언트
│   │                     · fetch_paper(id)        단건 조회
│   │                     · search_papers(query)   검색
│   └── solar.py        Upstage Solar API 클라이언트
│                         · extract_keywords(paper) → KeywordResult
│
└── extractors/
    └── keyword.py      두 클라이언트를 엮는 오케스트레이터
                          · from_paper(paper)      Paper 객체 직접
                          · from_id(openalex_id)   ID로 조회 후 추출
                          · from_search(query)     검색 후 일괄 추출
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

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/health` | 서버 상태 확인 |
| `POST` | `/extract/id` | OpenAlex ID로 단건 추출 |
| `POST` | `/extract/search` | 검색어로 일괄 추출 |

### `POST /extract/id`

```json
// 요청
{ "openalex_id": "W2741809807" }

// 응답
{
  "paper_id": "W2741809807",
  "title": "Attention Is All You Need",
  "year": 2017,
  "keywords": ["transformer", "self-attention", "positional encoding"],
  "methods": ["multi-head attention", "scaled dot-product attention"],
  "concepts": ["natural language processing", "sequence modeling"]
}
```

### `POST /extract/search`

```json
// 요청
{
  "query": "transformer attention",
  "count": 5,
  "year_from": 2020,
  "year_to": 2024,
  "open_access_only": false,
  "request_delay": 1.0
}

// 응답
{
  "total": 5,
  "results": [ /* KeywordResult 배열 */ ]
}
```

---

## Next.js 앱에서 호출하는 방법

`app/api/` 쪽에 아래처럼 프록시 라우트를 추가하면 됩니다.

```typescript
// app/api/keywords/route.ts
export async function POST(req: Request) {
  const body = await req.json();
  const res = await fetch("http://localhost:8000/extract/search", {
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
