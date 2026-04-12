from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


class Author(BaseModel):
    name: str
    institution: Optional[str] = None


class Paper(BaseModel):
    id: str                        # OpenAlex short ID (e.g. "W2741809807")
    title: str
    abstract: Optional[str] = None
    authors: list[Author] = []
    year: Optional[int] = None
    citation_count: int = 0
    fields: list[str] = []        # OpenAlex topics (상위 3개)
    doi: Optional[str] = None
    pdf_url: Optional[str] = None
    open_access: bool = False


class KeywordResult(BaseModel):
    paper_id: str
    title: str
    year: Optional[int] = None
    keywords: list[str]           # 구체적 기술 키워드 (5~10개)
    methods: list[str]            # 제안·사용된 방법론/알고리즘
    concepts: list[str]           # 상위 연구 분야·개념
