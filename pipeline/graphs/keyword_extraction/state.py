from __future__ import annotations

import operator
from typing import Annotated, TypedDict

PAPER_TYPES = ("Applied", "Theoretical", "Survey", "Tools")

LAYER_META = {
    "l1": {"tag": "#계보",  "en": "Lineage"},
    "l2": {"tag": "#원리",  "en": "Principle"},
    "l3": {"tag": "#과정",  "en": "Process"},
    "l4": {"tag": "#제안",  "en": "Proposal"},
    "l5": {"tag": "#필드",  "en": "Field"},
    "l6": {"tag": "#한계",  "en": "Limitation"},
}


class ExtractionState(TypedDict):
    # ── 입력 ──────────────────────────────────────────
    paper_id: str
    title: str
    abstract: str

    # ── classify 노드가 채움 ───────────────────────────
    paper_type: str   # "Applied" | "Theoretical" | "Survey" | "Tools"

    # ── 각 레이어 노드가 채움 ─────────────────────────
    l1: list[str]     # #계보  Lineage
    l2: list[str]     # #원리  Principle
    l3: list[str]     # #과정  Process
    l4: list[str]     # #제안  Proposal
    l5: list[str]     # #필드  Field
    l6: list[str]     # #한계  Limitation

    # ── 오류 누적 (operator.add 리듀서로 append) ──────
    errors: Annotated[list[str], operator.add]
