"""논문 키워드 추출 CLI

사용법:
  # OpenAlex ID로 단건 추출
  python main.py id W2741809807

  # 검색어로 여러 편 일괄 추출
  python main.py search "transformer attention mechanism" --count 5

  # 결과를 JSON 파일로 저장
  python main.py search "diffusion model" --count 10 -o results.json

  # 연도 범위 + OA 논문만
  python main.py search "RLHF" --count 20 --year-from 2021 --year-to 2024 --oa
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()  # .env 파일 자동 로드

from extractors.keyword import from_id, from_search  # noqa: E402  (load_dotenv 먼저)


# ── CLI 파서 ──────────────────────────────────────────────────────────────


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="keyword-extractor",
        description="OpenAlex 논문 → Upstage Solar 키워드 추출기",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    sub = parser.add_subparsers(dest="command", required=True)

    # ── 단건 ──────────────────────────────────────────────────────────────
    p_id = sub.add_parser("id", help="OpenAlex Work ID로 단건 추출")
    p_id.add_argument("openalex_id", help="예: W2741809807")
    p_id.add_argument("-o", "--output", metavar="FILE", help="저장할 JSON 파일 경로")

    # ── 배치 검색 ──────────────────────────────────────────────────────────
    p_search = sub.add_parser("search", help="검색어로 여러 편 일괄 추출")
    p_search.add_argument("query", help="검색어 (영문 권장)")
    p_search.add_argument("-n", "--count", type=int, default=10, metavar="N",
                          help="처리할 논문 수 (기본: 10)")
    p_search.add_argument("--year-from", type=int, metavar="YEAR", help="시작 연도")
    p_search.add_argument("--year-to",   type=int, metavar="YEAR", help="종료 연도")
    p_search.add_argument("--oa", action="store_true", help="오픈 액세스 논문만")
    p_search.add_argument("--delay", type=float, default=1.0, metavar="SEC",
                          help="요청 간 대기 시간(초, 기본: 1.0)")
    p_search.add_argument("-o", "--output", metavar="FILE", help="저장할 JSON 파일 경로")

    return parser


# ── 출력 헬퍼 ─────────────────────────────────────────────────────────────


def _dump(data: dict | list, output_path: str | None) -> None:
    text = json.dumps(data, ensure_ascii=False, indent=2)
    if output_path:
        Path(output_path).write_text(text, encoding="utf-8")
        print(f"\n저장 완료 → {output_path}")
    else:
        print(text)


# ── 진입점 ────────────────────────────────────────────────────────────────


def main() -> None:
    args = _build_parser().parse_args()

    if args.command == "id":
        result = from_id(args.openalex_id)
        if result is None:
            sys.exit(1)
        _dump(result.model_dump(), args.output)

    elif args.command == "search":
        results = from_search(
            query=args.query,
            count=args.count,
            year_from=args.year_from,
            year_to=args.year_to,
            open_access_only=args.oa,
            request_delay=args.delay,
        )
        _dump([r.model_dump() for r in results], args.output)


if __name__ == "__main__":
    main()
