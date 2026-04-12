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


class StructuredKeywordResult(BaseModel):
    """LangGraph 기반 구조화 키워드 추출 결과.

    논문 유형(paper_type)에 따라 L1~L6 레이어별로 키워드를 분리한다.
    """
    paper_id: str
    title: str
    year: Optional[int] = None
    paper_type: str               # Applied | Theoretical | Survey | Tools
    l1_lineage: list[str]         # #계보  — 기반 모델·계보·마일스톤
    l2_principle: list[str]       # #원리  — 핵심 원리·수리적 전제·구조
    l3_process: list[str]         # #과정  — 실험 설계·증명 과정·파이프라인
    l4_proposal: list[str]        # #제안  — 기여·확장·로드맵
    l5_field: list[str]           # #필드  — 적용 분야·파급력
    l6_limitation: list[str]      # #한계  — 제약·간극·노이즈
    errors: list[str] = []
