from __future__ import annotations

import sys
import time
from typing import Optional

from clients.openalex import fetch_paper, search_papers
from graphs.keyword_extraction.graph import get_graph
from models.paper import Paper, StructuredKeywordResult


def _run_graph(paper: Paper) -> StructuredKeywordResult:
    graph = get_graph()
    initial: dict = {
        "paper_id": paper.id,
        "title": paper.title,
        "abstract": paper.abstract or "",
        "paper_type": "",
        "l1": [], "l2": [], "l3": [], "l4": [], "l5": [], "l6": [],
        "errors": [],
    }
    state = graph.invoke(initial)
    return StructuredKeywordResult(
        paper_id=state["paper_id"],
        title=state["title"],
        year=paper.year,
        paper_type=state["paper_type"],
        l1_lineage=state["l1"],
        l2_principle=state["l2"],
        l3_process=state["l3"],
        l4_proposal=state["l4"],
        l5_field=state["l5"],
        l6_limitation=state["l6"],
        errors=state["errors"],
    )


def from_paper(paper: Paper) -> StructuredKeywordResult:
    """Paper 객체를 직접 받아 구조화 키워드를 추출한다."""
    return _run_graph(paper)


def from_id(openalex_id: str) -> Optional[StructuredKeywordResult]:
    """OpenAlex ID로 논문을 조회한 뒤 구조화 키워드를 추출한다."""
    paper = fetch_paper(openalex_id)
    if paper is None:
        print(f"[openalex] 논문을 찾을 수 없습니다: {openalex_id}", file=sys.stderr)
        return None
    print(f"[openalex] 조회 완료: {paper.title[:70]}")
    return _run_graph(paper)


def from_search(
    query: str,
    count: int = 10,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    open_access_only: bool = False,
    request_delay: float = 1.5,
) -> list[StructuredKeywordResult]:
    """검색어로 논문 여러 편을 가져와 일괄 구조화 키워드를 추출한다."""
    papers = search_papers(
        query,
        per_page=count,
        year_from=year_from,
        year_to=year_to,
        open_access_only=open_access_only,
    )
    print(f"[openalex] '{query}' 검색 결과: {len(papers)}편")

    results: list[StructuredKeywordResult] = []
    for i, paper in enumerate(papers, 1):
        print(f"  [{i}/{len(papers)}] {paper.title[:65]}...")
        try:
            result = _run_graph(paper)
            results.append(result)
            print(f"    → {result.paper_type} | L1:{len(result.l1_lineage)} L2:{len(result.l2_principle)} ... L6:{len(result.l6_limitation)}")
        except Exception as exc:
            print(f"    오류 (건너뜀): {exc}", file=sys.stderr)

        if i < len(papers):
            time.sleep(request_delay)

    print(f"[완료] {len(results)}/{len(papers)}편 추출 성공")
    return results
