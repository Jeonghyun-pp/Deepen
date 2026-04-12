from __future__ import annotations

from clients.solar import call_json
from .state import ExtractionState, PAPER_TYPES
from .prompts import classify as p_classify
from .prompts import applied, theoretical, survey, tools

# paper_type → 프롬프트 모듈 매핑
PROMPT_MAP = {
    "Applied":     applied,
    "Theoretical": theoretical,
    "Survey":      survey,
    "Tools":       tools,
}


# ── 플레이스홀더 렌더링 ─────────────────────────────────────────────────────


def _fmt(template: str, **kwargs: str) -> str:
    """{VAR} 플레이스홀더를 안전하게 치환한다.

    str.format() 대신 직접 replace를 사용하여
    abstract 안에 중괄호가 있어도 오류가 나지 않는다.
    """
    result = template
    for key, value in kwargs.items():
        result = result.replace("{" + key + "}", value)
    return result


# ── 노드 1: 분류 ───────────────────────────────────────────────────────────


def classify(state: ExtractionState) -> dict:
    """논문 유형을 Applied / Theoretical / Survey / Tools 중 하나로 분류."""
    try:
        user = _fmt(
            p_classify.USER,
            TITLE=state["title"],
            ABSTRACT=state["abstract"] or "(not available)",
        )
        result = call_json(p_classify.SYSTEM, user)
        paper_type = result.get("paper_type", "Applied")
        if paper_type not in PAPER_TYPES:
            paper_type = "Applied"
        return {"paper_type": paper_type}
    except Exception as exc:
        return {"paper_type": "Applied", "errors": [f"classify: {exc}"]}


# ── 노드 2: L1~L6 일괄 추출 ───────────────────────────────────────────────


def extract_all(state: ExtractionState) -> dict:
    """paper_type에 맞는 프롬프트로 L1~L6 키워드를 한 번에 추출한다."""
    module = PROMPT_MAP.get(state["paper_type"], applied)
    try:
        user = _fmt(
            module.USER,
            TITLE=state["title"],
            ABSTRACT=state["abstract"] or "(not available)",
        )
        result = call_json(module.SYSTEM, user)
        return {
            "l1": result.get("l1") or [],
            "l2": result.get("l2") or [],
            "l3": result.get("l3") or [],
            "l4": result.get("l4") or [],
            "l5": result.get("l5") or [],
            "l6": result.get("l6") or [],
        }
    except Exception as exc:
        return {
            "l1": [], "l2": [], "l3": [], "l4": [], "l5": [], "l6": [],
            "errors": [f"extract_all ({state['paper_type']}): {exc}"],
        }
