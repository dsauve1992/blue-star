#!/usr/bin/env python3
"""
Leader Scan — CLI entry point.

Emits JSON on stdout describing the top 2% of the filtered US universe
ranked by RS_score = max(percentile_rank_1M, percentile_rank_3M, percentile_rank_6M).

Usage:
    python main.py --format json
    python main.py --format json --min-dollar-volume 10000000 --min-adr 5
"""

import argparse
import json
import sys
from datetime import date

from ranking_service import (
    DEFAULT_MIN_ADR,
    DEFAULT_MIN_DOLLAR_VOLUME,
    filter_universe,
    rank_and_select_leaders,
    record_to_dict,
)
from tradingview_screener_client import fetch_universe


def main() -> int:
    parser = argparse.ArgumentParser(description="Leader Scan — weekly RS leaders")
    parser.add_argument("--format", choices=["json", "text"], default="json")
    parser.add_argument("--min-dollar-volume", type=float, default=DEFAULT_MIN_DOLLAR_VOLUME)
    parser.add_argument("--min-adr", type=float, default=DEFAULT_MIN_ADR)
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    if not args.quiet:
        print("Leader Scan starting…", file=sys.stderr)

    universe = fetch_universe()
    if not args.quiet:
        print(f"Fetched {len(universe)} tickers from TradingView", file=sys.stderr)

    filtered = filter_universe(universe, args.min_dollar_volume, args.min_adr)
    if not args.quiet:
        print(f"Filtered universe: {len(filtered)} tickers", file=sys.stderr)

    leaders = rank_and_select_leaders(filtered)
    if not args.quiet:
        print(f"Leaders: {len(leaders)}", file=sys.stderr)

    payload = {
        "scan_date": date.today().isoformat(),
        "universe_size": len(filtered),
        "leader_count": len(leaders),
        "results": [record_to_dict(r) for r in leaders],
    }

    if args.format == "json":
        json.dump(payload, sys.stdout)
        sys.stdout.write("\n")
    else:
        for r in leaders:
            print(
                f"{r.ticker:<8} {r.sector:<24} rs={r.rs_score:.3f} "
                f"1M={r.perf_1m:+.2%} 3M={r.perf_3m:+.2%} 6M={r.perf_6m:+.2%} "
                f"ADR={r.adr_20:.2f}"
            )

    return 0


if __name__ == "__main__":
    sys.exit(main())
