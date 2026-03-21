#!/usr/bin/env python3
"""
RS Rating Service
Computes IBD-style Relative Strength ratings (1-99) for US stocks
using TradingView scanner performance data.
"""
import json
import sys
import argparse
from datetime import date
from screener_service import ScreenerService, RawScreenerEntry
from dataclasses import dataclass
from typing import List


@dataclass
class StockPerformance:
    symbol: str
    perf_3m: float
    perf_6m: float
    perf_y: float


def map_entry(entry: RawScreenerEntry) -> StockPerformance | None:
    fields = entry.data_fields
    # columns: name, close, market_cap_basic, Perf.3M, Perf.6M, Perf.Y
    name = fields[0]
    perf_3m = fields[3]
    perf_6m = fields[4]
    perf_y = fields[5]

    if perf_3m is None or perf_6m is None or perf_y is None:
        return None

    # Extract symbol from full name (e.g. "NASDAQ:AAPL" -> "AAPL")
    symbol = entry.symbol_full.split(':')[-1] if ':' in entry.symbol_full else entry.symbol_full

    return StockPerformance(
        symbol=symbol,
        perf_3m=perf_3m,
        perf_6m=perf_6m,
        perf_y=perf_y,
    )


def compute_weighted_score(stock: StockPerformance) -> float:
    """
    Weighted score formula:
    Q1 = Perf.3M (most recent quarter)
    Q2 = Perf.6M - Perf.3M (second quarter)
    H2 = Perf.Y - Perf.6M (older two quarters combined)
    weighted_score = 0.4 * Q1 + 0.2 * Q2 + 0.2 * H2
    """
    q1 = stock.perf_3m
    q2 = stock.perf_6m - stock.perf_3m
    h2 = stock.perf_y - stock.perf_6m
    return 0.4 * q1 + 0.2 * q2 + 0.2 * h2


def percentile_rank(values: List[float], value: float) -> float:
    """Calculate percentile rank (0-100) of value within values list."""
    count_below = sum(1 for v in values if v < value)
    count_equal = sum(1 for v in values if v == value)
    return (count_below + 0.5 * count_equal) / len(values) * 100


def compute_rs_ratings(quiet: bool = False) -> dict:
    screener = ScreenerService()

    columns = [
        "name",
        "close",
        "market_cap_basic",
        "Perf.3M",
        "Perf.6M",
        "Perf.Y",
    ]

    filters = [
        {"left": "close", "operation": "greater", "right": 1},
        {"left": "market_cap_basic", "operation": "greater", "right": 300000000},
        {"left": "is_primary", "operation": "equal", "right": True},
        {"left": "type", "operation": "equal", "right": "stock"},
    ]

    parameters = ScreenerService.create_basic_parameters(
        columns=columns,
        filters=filters,
        markets=["america"],
        sort_by="market_cap_basic",
        sort_order="desc",
        range_limit=[0, 10000],
    )

    if not quiet:
        print("Fetching performance data from TradingView...", file=sys.stderr)

    raw_entries = screener.scan(parameters, map_entry)

    # Filter out None entries (stocks missing performance data)
    stocks = [s for s in raw_entries if s is not None]

    if not quiet:
        print(f"Found {len(stocks)} stocks with complete performance data", file=sys.stderr)

    # Compute weighted scores
    scored = []
    for stock in stocks:
        score = compute_weighted_score(stock)
        scored.append((stock.symbol, score))

    # Compute percentile ranks
    all_scores = [s[1] for s in scored]
    ratings = []

    for symbol, score in scored:
        pct = percentile_rank(all_scores, score)
        # Clamp to 1-99 range
        rs_rating = max(1, min(99, round(pct)))
        ratings.append({
            "symbol": symbol,
            "rs_rating": rs_rating,
            "weighted_score": round(score, 4),
        })

    # Sort by rs_rating descending
    ratings.sort(key=lambda x: x["rs_rating"], reverse=True)

    return {
        "ratings": ratings,
        "count": len(ratings),
        "computed_at": date.today().isoformat(),
    }


def main():
    parser = argparse.ArgumentParser(description='RS Rating - Relative Strength ratings for US stocks')
    parser.add_argument('--format', choices=['json', 'text'], default='text', help='Output format (default: text)')
    parser.add_argument('--quiet', action='store_true', help='Suppress non-essential output')

    args = parser.parse_args()

    try:
        result = compute_rs_ratings(quiet=args.quiet)

        if args.format == 'json':
            print(json.dumps(result))
        else:
            print(f"\nRS Ratings ({result['count']} stocks, computed {result['computed_at']})")
            print("-" * 60)
            for r in result['ratings'][:20]:
                print(f"  {r['symbol']:>8s}  RS: {r['rs_rating']:3d}  Score: {r['weighted_score']:8.4f}")
            if result['count'] > 20:
                print(f"  ... and {result['count'] - 20} more")

    except Exception as error:
        if args.format == 'json':
            error_result = {
                'error': str(error),
                'ratings': [],
                'count': 0,
                'computed_at': date.today().isoformat(),
            }
            print(json.dumps(error_result))
            sys.exit(1)
        else:
            print(f"Error during RS rating computation: {error}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
