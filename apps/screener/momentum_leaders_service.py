#!/usr/bin/env python3
"""
Momentum Leaders Service
Selects the top performers of the market-breadth universe: for each of the
1M, 3M and 6M horizons, keeps the top 2% of the universe, then unions the
three slices. Same selection as apps/hot-theme-detection.
"""
import json
import sys
import argparse
from dataclasses import dataclass
from datetime import date
from typing import List

from screener_service import ScreenerService, RawScreenerEntry
from rs_rating_service import UNIVERSE_FILTERS, percentile_rank

TOP_PERCENT = 2.0
HORIZONS = ("perf_1m", "perf_3m", "perf_6m")


@dataclass
class UniverseStock:
    symbol: str
    exchange: str
    sector: str
    perf_1m: float
    perf_3m: float
    perf_6m: float


def map_entry(entry: RawScreenerEntry) -> UniverseStock | None:
    fields = entry.data_fields
    # columns: name, sector, Perf.1M, Perf.3M, Perf.6M
    perf_1m, perf_3m, perf_6m = fields[2], fields[3], fields[4]
    if perf_1m is None or perf_3m is None or perf_6m is None:
        return None

    exchange, _, symbol = entry.symbol_full.rpartition(':')
    return UniverseStock(
        symbol=symbol,
        exchange=exchange,
        sector=fields[1] or '',
        perf_1m=perf_1m,
        perf_3m=perf_3m,
        perf_6m=perf_6m,
    )


def select_leaders(universe: List[UniverseStock]) -> List[dict]:
    keep = max(1, round(len(universe) * TOP_PERCENT / 100))
    flags = {stock.symbol: {h: False for h in HORIZONS} for stock in universe}
    values = {h: [getattr(s, h) for s in universe] for h in HORIZONS}

    for horizon in HORIZONS:
        ranked = sorted(universe, key=lambda s: getattr(s, horizon), reverse=True)
        for stock in ranked[:keep]:
            flags[stock.symbol][horizon] = True

    leaders = []
    for stock in universe:
        if not any(flags[stock.symbol].values()):
            continue
        ranks = {h: percentile_rank(values[h], getattr(stock, h)) for h in HORIZONS}
        leaders.append({
            "symbol": stock.symbol,
            "exchange": stock.exchange,
            "sector": stock.sector,
            "perf_1m": stock.perf_1m,
            "perf_3m": stock.perf_3m,
            "perf_6m": stock.perf_6m,
            "rank_1m": round(ranks["perf_1m"], 2),
            "rank_3m": round(ranks["perf_3m"], 2),
            "rank_6m": round(ranks["perf_6m"], 2),
            "rs_score": round(max(ranks.values()), 2),
            "top_1m": flags[stock.symbol]["perf_1m"],
            "top_3m": flags[stock.symbol]["perf_3m"],
            "top_6m": flags[stock.symbol]["perf_6m"],
        })

    leaders.sort(key=lambda x: x["rs_score"], reverse=True)
    return leaders


def compute_momentum_leaders(quiet: bool = False) -> dict:
    screener = ScreenerService()
    parameters = ScreenerService.create_basic_parameters(
        columns=["name", "sector", "Perf.1M", "Perf.3M", "Perf.6M"],
        filters=UNIVERSE_FILTERS,
        markets=["america"],
        sort_by="market_cap_basic",
        sort_order="desc",
        range_limit=[0, 10000],
    )

    if not quiet:
        print("Fetching universe performance data from TradingView...", file=sys.stderr)

    universe = [s for s in screener.scan(parameters, map_entry) if s is not None]

    if not quiet:
        print(f"Universe: {len(universe)} stocks with complete performance data", file=sys.stderr)

    leaders = select_leaders(universe)

    if not quiet:
        print(f"Selected {len(leaders)} momentum leaders", file=sys.stderr)

    return {
        "scan_date": date.today().isoformat(),
        "universe_size": len(universe),
        "leader_count": len(leaders),
        "leaders": leaders,
    }


def main():
    parser = argparse.ArgumentParser(description='Momentum Leaders - top 2% performers per horizon')
    parser.add_argument('--format', choices=['json', 'text'], default='text')
    parser.add_argument('--quiet', action='store_true')
    args = parser.parse_args()

    try:
        result = compute_momentum_leaders(quiet=args.quiet)

        if args.format == 'json':
            print(json.dumps(result))
        else:
            print(f"\nMomentum Leaders ({result['leader_count']} of {result['universe_size']}, {result['scan_date']})")
            print("-" * 72)
            for r in result['leaders']:
                tags = ''.join(t for t, on in (('1M ', r['top_1m']), ('3M ', r['top_3m']), ('6M', r['top_6m'])) if on)
                print(f"  {r['symbol']:>8s}  RS {r['rs_score']:6.2f}  1M {r['perf_1m']:7.1f}%  3M {r['perf_3m']:7.1f}%  6M {r['perf_6m']:7.1f}%  {tags}")

    except Exception as error:
        if args.format == 'json':
            print(json.dumps({
                'error': str(error),
                'scan_date': date.today().isoformat(),
                'universe_size': 0,
                'leader_count': 0,
                'leaders': [],
            }))
        else:
            print(f"Error during momentum leaders computation: {error}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
