"""FastAPI 서버 — 논문 키워드 추출 API

실행:
  cd pipeline
  uvicorn api:app --reload --port 8000

Next.js 등 외부에서 호출:
  POST http://localhost:8000/extract/id     { "openalex_id": "W2741809807" }
  POST http://localhost:8000/extract/search { "query": "transformer", "count": 10 }
"""

from __future__ import annotations

from typing import Optional

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from extractors.structured_keyword import from_id, from_search
from models.paper import StructuredKeywordResult

# ── 앱 초기화 ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="Deepen Keyword Extractor",
    description="OpenAlex 논문 → Upstage Solar LangGraph 키워드 추출 API",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://deepen-iota.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 요청/응답 스키마 ───────────────────────────────────────────────────────


class IdRequest(BaseModel):
    openalex_id: str = Field(..., examples=["W2741809807"])


class SearchRequest(BaseModel):
    query: str = Field(..., examples=["transformer attention mechanism"])
    count: int = Field(10, ge=1, le=100)
    year_from: Optional[int] = None
    year_to: Optional[int] = None
    open_access_only: bool = False
    request_delay: float = Field(1.5, ge=0.0, le=10.0)


class SearchResponse(BaseModel):
    total: int
    results: list[StructuredKeywordResult]


# ── 엔드포인트 ────────────────────────────────────────────────────────────


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/extract/id", response_model=StructuredKeywordResult)
def extract_by_id(body: IdRequest) -> StructuredKeywordResult:
    """OpenAlex ID로 논문 단건 구조화 키워드 추출 (L1~L6)."""
    result = from_id(body.openalex_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"논문을 찾을 수 없습니다: {body.openalex_id}")
    return result


@app.post("/extract/search", response_model=SearchResponse)
def extract_by_search(body: SearchRequest) -> SearchResponse:
    """검색어로 논문 여러 편 구조화 키워드 일괄 추출 (L1~L6)."""
    results = from_search(
        query=body.query,
        count=body.count,
        year_from=body.year_from,
        year_to=body.year_to,
        open_access_only=body.open_access_only,
        request_delay=body.request_delay,
    )
    return SearchResponse(total=len(results), results=results)
