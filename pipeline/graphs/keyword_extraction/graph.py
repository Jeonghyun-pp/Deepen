from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from .nodes import classify, extract_all
from .state import ExtractionState

# ── 그래프 정의 ────────────────────────────────────────────────────────────
#
#  START → classify → extract_all → END
#
#  classify   : 논문 유형 결정 (Applied / Theoretical / Survey / Tools)
#  extract_all: 유형 전용 프롬프트로 L1~L6 키워드를 한 번에 추출


def _build() -> StateGraph:
    g = StateGraph(ExtractionState)

    g.add_node("classify",    classify)
    g.add_node("extract_all", extract_all)

    g.add_edge(START,         "classify")
    g.add_edge("classify",    "extract_all")
    g.add_edge("extract_all", END)

    return g.compile()


_graph = _build()


def get_graph():
    """컴파일된 키워드 추출 그래프 싱글턴을 반환한다."""
    return _graph
