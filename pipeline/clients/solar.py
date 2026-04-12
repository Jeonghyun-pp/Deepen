from __future__ import annotations

import json
import os
from functools import lru_cache

from openai import OpenAI

_UPSTAGE_BASE_URL = "https://api.upstage.ai/v1"
_DEFAULT_MODEL = "solar-pro"


@lru_cache(maxsize=1)
def _client() -> OpenAI:
    api_key = os.environ.get("UPSTAGE_API_KEY")
    if not api_key:
        raise EnvironmentError("UPSTAGE_API_KEY 환경변수가 설정되지 않았습니다.")
    return OpenAI(api_key=api_key, base_url=_UPSTAGE_BASE_URL)


def call_json(
    system_prompt: str,
    user_message: str,
    model: str = _DEFAULT_MODEL,
    temperature: float = 0.1,
) -> dict:
    """Solar API를 호출하고 JSON dict를 반환하는 범용 헬퍼.

    Raises:
        EnvironmentError: UPSTAGE_API_KEY 미설정 시.
        ValueError: 응답이 유효한 JSON이 아닐 때.
    """
    response = _client().chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        response_format={"type": "json_object"},
        temperature=temperature,
    )
    raw = response.choices[0].message.content or "{}"
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Solar 응답 JSON 파싱 실패: {e}\n응답: {raw}") from e
