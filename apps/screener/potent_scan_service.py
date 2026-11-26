#!/usr/bin/env python3
"""
Potent Scan Service
Selects the session's top gainers: the top 2% of the RS-rating universe by
1-day change, with a looser liquidity rule so stocks count on the day they
wake up. Gainers that fail only the liquidity rule are reported as near misses.
"""
import json
import sys
import argparse
from datetime import date
from typing import List

from screener_service import ScreenerService, RawScreenerEntry
from rs_rating_service import UNIVERSE_FILTERS

TOP_PERCENT = 2.0
MIN_AVG_VALUE_TRADED_30D = 5e6
MIN_VALUE_TRADED = 10e6
RANGE_LIMIT = 10000

COLUMNS = [
    "name", "change", "close", "ADR", "relative_volume_10d_calc", "market_cap_basic",
    "sector", "industry", "EMA9", "EMA21", "EMA50", "Value.Traded", "AvgValue.Traded_30d",
]
FILTERS_WITHOUT_LIQUIDITY = [f for f in UNIVERSE_FILTERS if f["left"] != "AvgValue.Traded_30d"]


def tier(ema9: float | None, ema21: float | None, ema50: float | None) -> str | None:
    if None in (ema9, ema21, ema50):
        return None
    if ema9 > ema21 > ema50:
        return "Lead"
    if ema9 < ema21 < ema50:
        return "Lag"
    return "Mediocre"


def is_liquid(row: dict) -> bool:
    avg_value_traded_30d = row["avg_value_traded_30d"] or 0
    value_traded = row["value_traded"] or 0
    return avg_value_traded_30d >= MIN_AVG_VALUE_TRADED_30D or value_traded >= MIN_VALUE_TRADED


def map_entry(entry: RawScreenerEntry) -> dict | None:
    (_, change, close, adr, relative_volume, market_cap, sector, industry,
     ema9, ema21, ema50, value_traded, avg_value_traded_30d) = entry.data_fields
    if change is None:
        return None

    exchange, _, symbol = entry.symbol_full.rpartition(':')
    return {
        "symbol": symbol,
        "exchange": exchange,
        "change": change,
        "close": close,
        "adr_pct": round(adr / close * 100, 2) if adr is not None and close else None,
        "relative_volume_10d_calc": relative_volume,
        "market_cap_basic": market_cap,
        "sector": sector or '',
        "industry": industry or '',
        "EMA9": ema9,
        "EMA21": ema21,
        "EMA50": ema50,
        "tier": tier(ema9, ema21, ema50),
        "value_traded": value_traded,
        "avg_value_traded_30d": avg_value_traded_30d,
    }


def select_potent(rows: List[dict]) -> dict:
    universe = [r for r in rows if is_liquid(r)]
    if not universe:
        raise Exception("Empty universe")

    keep = max(1, round(len(universe) * TOP_PERCENT / 100))
    by_change = sorted(universe, key=lambda r: r["change"], reverse=True)
    hits = [r for r in by_change[:keep] if r["change"] > 0]
    if not hits:
        raise Exception("No gainers in the universe")

    cutoff = hits[-1]["change"]
    near_misses = sorted(
        (r for r in rows if not is_liquid(r) and r["change"] > 0 and r["change"] >= cutoff),
        key=lambda r: r["change"],
        reverse=True,
    )

    hit_fields = [k for k in hits[0] if k not in ("value_traded", "avg_value_traded_30d")]
    return {
        "universe_size": len(universe),
        "hits": [{k: r[k] for k in hit_fields} for r in hits],
        "near_misses": near_misses,
    }


def compute_potent_scan(quiet: bool = False) -> dict:
    screener = ScreenerService()
    parameters = ScreenerService.create_basic_parameters(
        columns=COLUMNS,
        filters=FILTERS_WITHOUT_LIQUIDITY,
        markets=["america"],
        sort_by="change",
        sort_order="desc",
        range_limit=[0, RANGE_LIMIT],
    )

    if not quiet:
        print("Fetching session changes from TradingView...", file=sys.stderr)

    entries = screener.scan(parameters, map_entry)
    if len(entries) >= RANGE_LIMIT:
        raise Exception(f"Screener returned {len(entries)} rows, the universe may be truncated")

    result = select_potent([r for r in entries if r is not None])

    if not quiet:
        print(f"Universe: {result['universe_size']}, hits: {len(result['hits'])}, "
              f"near misses: {len(result['near_misses'])}", file=sys.stderr)

    return {"scan_date": date.today().isoformat(), **result}


def main():
    parser = argparse.ArgumentParser(description='Potent scan - top 2% gainers of the session')
    parser.add_argument('--quiet', action='store_true')
    args = parser.parse_args()

    try:
        print(json.dumps(compute_potent_scan(quiet=args.quiet)))
    except Exception as error:
        print(json.dumps({'error': str(error)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
