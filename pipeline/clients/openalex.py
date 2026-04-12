from __future__ import annotations

import os
from typing import Any, Optional

import requests

from models.paper import Author, Paper

_BASE_URL = "https://api.openalex.org"


# ── 내부 헬퍼 ──────────────────────────────────────────────────────────────


def _base_params() -> dict[str, str]:
    """mailto polite-pool 파라미터 (환경변수 있으면 포함)."""
    email = os.getenv("OPENALEX_EMAIL", "")
    return {"mailto": email} if email else {}


def _reconstruct_abstract(inverted: dict[str, list[int]] | None) -> Optional[str]:
    """OpenAlex abstract_inverted_index → 평문 변환."""
    if not inverted:
        return None
    words: list[tuple[int, str]] = [
        (pos, word)
        for word, positions in inverted.items()
        for pos in positions
    ]
    words.sort()
    return " ".join(w for _, w in words)


def _normalize(work: dict[str, Any]) -> Paper:
    authorships = work.get("authorships") or []
    topics = work.get("topics") or []
    oa = work.get("open_access") or {}
    primary = work.get("primary_location") or {}

    return Paper(
        id=work.get("id", "").replace("https://openalex.org/", ""),
        title=work.get("title") or "Untitled",
        abstract=_reconstruct_abstract(work.get("abstract_inverted_index")),
        authors=[
            Author(
                name=(a.get("author") or {}).get("display_name", "Unknown"),
                institution=(
                    (a.get("institutions") or [{}])[0].get("display_name")
                    if a.get("institutions")
                    else None
                ),
            )
            for a in authorships
        ],
        year=work.get("publication_year"),
        citation_count=work.get("cited_by_count", 0),
        fields=[t["display_name"] for t in topics[:3] if t.get("display_name")],
        doi=work.get("doi"),
        pdf_url=oa.get("oa_url") or primary.get("pdf_url"),
        open_access=oa.get("is_oa", False),
    )


# ── 공개 API ───────────────────────────────────────────────────────────────


def fetch_paper(openalex_id: str) -> Optional[Paper]:
    """OpenAlex ID 또는 전체 URL로 논문 단건 조회.

    Args:
        openalex_id: "W2741809807" 또는 "https://openalex.org/W2741809807"
    Returns:
        Paper 객체, 없으면 None.
    """
    if not openalex_id.startswith("https://"):
        openalex_id = f"https://openalex.org/{openalex_id}"

    res = requests.get(
        f"{_BASE_URL}/works/{openalex_id}",
        params=_base_params(),
        timeout=15,
    )
    if res.status_code == 404:
        return None
    res.raise_for_status()
    return _normalize(res.json())


def search_papers(
    query: str,
    per_page: int = 10,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    open_access_only: bool = False,
    sort: str = "relevance_score:desc",
) -> list[Paper]:
    """키워드로 OpenAlex 논문 검색.

    Args:
        query: 검색어 (영문 권장).
        per_page: 반환 논문 수 (최대 200).
        year_from / year_to: 연도 범위 필터.
        open_access_only: True면 OA 논문만.
        sort: 정렬 기준.
    Returns:
        Paper 리스트.
    """
    filters: list[str] = []
    if year_from and year_to:
        filters.append(f"publication_year:{year_from}-{year_to}")
    elif year_from:
        filters.append(f"publication_year:{year_from}-")
    elif year_to:
        filters.append(f"publication_year:-{year_to}")
    if open_access_only:
        filters.append("open_access.is_oa:true")

    params: dict[str, Any] = {
        **_base_params(),
        "search": query,
        "per_page": per_page,
        "sort": sort,
    }
    if filters:
        params["filter"] = ",".join(filters)

    res = requests.get(f"{_BASE_URL}/works", params=params, timeout=15)
    res.raise_for_status()
    return [_normalize(w) for w in res.json().get("results", [])]
