from __future__ import annotations

import sys
import time
from typing import Optional

from clients.openalex import fetch_paper, search_papers
from clients.solar import extract_keywords as _solar_extract
from models.paper import KeywordResult, Paper


def from_paper(paper: Paper) -> KeywordResult:
    """Paper 객체를 바로 받아 키워드를 추출한다."""
    return _solar_extract(paper)


def from_id(openalex_id: str) -> Optional[KeywordResult]:
    """OpenAlex ID로 논문을 조회한 뒤 키워드를 추출한다.

    Args:
        openalex_id: "W2741809807" 형식 또는 전체 URL.
    Returns:
        KeywordResult, 논문을 찾지 못하면 None.
    """
    paper = fetch_paper(openalex_id)
    if paper is None:
        print(f"[openalex] 논문을 찾을 수 없습니다: {openalex_id}", file=sys.stderr)
        return None
    print(f"[openalex] 조회 완료: {paper.title[:70]}")
    return _solar_extract(paper)


def from_search(
    query: str,
    count: int = 10,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    open_access_only: bool = False,
    request_delay: float = 1.0,
) -> list[KeywordResult]:
    """검색어로 논문 여러 편을 가져와 일괄 키워드를 추출한다.

    Args:
        query: 검색어 (영문 권장).
        count: 처리할 논문 수.
        year_from / year_to: 연도 범위 필터.
        open_access_only: True면 OA 논문만.
        request_delay: Solar API 요청 사이 대기 시간(초). rate-limit 방지.
    Returns:
        추출에 성공한 KeywordResult 리스트.
    """
    papers = search_papers(
        query,
        per_page=count,
        year_from=year_from,
        year_to=year_to,
        open_access_only=open_access_only,
    )
    print(f"[openalex] '{query}' 검색 결과: {len(papers)}편")

    results: list[KeywordResult] = []
    for i, paper in enumerate(papers, 1):
        print(f"  [{i}/{len(papers)}] {paper.title[:65]}...")
        try:
            result = _solar_extract(paper)
            results.append(result)
        except Exception as exc:
            print(f"    오류 (건너뜀): {exc}", file=sys.stderr)

        if i < len(papers):
            time.sleep(request_delay)

    print(f"[완료] {len(results)}/{len(papers)}편 추출 성공")
    return results
