from __future__ import annotations

import json
import os
from functools import lru_cache

from openai import OpenAI

from models.paper import KeywordResult, Paper

_UPSTAGE_BASE_URL = "https://api.upstage.ai/v1"
_DEFAULT_MODEL = "solar-pro"

_SYSTEM_PROMPT = """\
You are an expert academic keyword extractor.
Given a paper's title and abstract, output a JSON object with exactly these three keys:

- "keywords": list of 5-10 specific technical keywords directly from the paper.
- "methods": list of methods, algorithms, architectures, or techniques the paper proposes or uses.
- "concepts": list of broader research areas or paradigms the paper belongs to.

Rules:
- Use concise English noun phrases (no sentences).
- Do not repeat entries across the three lists.
- If the abstract is missing, infer from the title only.
- Output valid JSON only — no markdown, no explanation.

Example output:
{
  "keywords": ["transformer", "self-attention", "positional encoding"],
  "methods": ["multi-head attention", "scaled dot-product attention"],
  "concepts": ["natural language processing", "sequence modeling"]
}
"""


@lru_cache(maxsize=1)
def _client() -> OpenAI:
    api_key = os.environ.get("UPSTAGE_API_KEY")
    if not api_key:
        raise EnvironmentError("UPSTAGE_API_KEY 환경변수가 설정되지 않았습니다.")
    return OpenAI(api_key=api_key, base_url=_UPSTAGE_BASE_URL)


def extract_keywords(
    paper: Paper,
    model: str = _DEFAULT_MODEL,
    temperature: float = 0.1,
) -> KeywordResult:
    """Solar API로 논문 키워드·방법론·개념을 추출한다.

    Args:
        paper: 추출 대상 Paper 객체.
        model: 사용할 Solar 모델명 (기본: "solar-pro").
        temperature: 낮을수록 결정적 출력 (기본: 0.1).
    Returns:
        KeywordResult (keywords / methods / concepts).
    Raises:
        EnvironmentError: UPSTAGE_API_KEY 미설정 시.
        ValueError: LLM 응답이 파싱 불가할 때.
    """
    abstract_text = paper.abstract or "(abstract not available)"
    user_message = f"Title: {paper.title}\n\nAbstract: {abstract_text}"

    response = _client().chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        response_format={"type": "json_object"},
        temperature=temperature,
    )

    raw = response.choices[0].message.content or "{}"
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Solar 응답 JSON 파싱 실패: {e}\n응답: {raw}") from e

    return KeywordResult(
        paper_id=paper.id,
        title=paper.title,
        year=paper.year,
        keywords=parsed.get("keywords") or [],
        methods=parsed.get("methods") or [],
        concepts=parsed.get("concepts") or [],
    )
