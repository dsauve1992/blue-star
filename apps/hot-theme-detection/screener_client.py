"""
Momentum screener: the working list of tickers to run theme detection over.

Same TradingView scanner endpoint and base filters as apps/screener, with the
moving-average stack filters (EMA10 > EMA20 > SMA50, close > EMA20) dropped so
the universe is defined by liquidity and size alone — roughly 2,000 names.

Momentum selection happens after the fetch, not in the query: the universe is
ranked separately by 1-month, 3-month and 6-month performance, the top slice of
each ranking is taken, and the three slices are merged with duplicates removed.
A name only needs to lead on one horizon to make the list, so a stock that just
started moving and one that has compounded for six months both qualify.
"""

from typing import Any

import requests

SCANNER_URL = "https://scanner.tradingview.com/america/scan"

COLUMNS = [
    "name",
    "close",
    "market_cap_basic",
    "AvgValue.Traded_30d",
    "Perf.1M",
    "Perf.3M",
    "Perf.6M",
    "sector",
]

PERFORMANCE_HORIZONS = ["Perf.1M", "Perf.3M", "Perf.6M"]

DEFAULT_TOP_PERCENT = 2.0
MIN_CLOSE = 2
MIN_MARKET_CAP = 300_000_000
MIN_DOLLAR_VOLUME = 10_000_000
MIN_AVG_VOLUME = 500_000


def fetch_universe(page_size: int = 20000) -> list[dict[str, Any]]:
    """US primary-listed common stocks passing the size and liquidity floors."""
    payload = {
        "columns": COLUMNS,
        "filter": [
            {"left": "close", "operation": "egreater", "right": MIN_CLOSE},
            {"left": "market_cap_basic", "operation": "egreater", "right": MIN_MARKET_CAP},
            {"left": "AvgValue.Traded_30d", "operation": "greater", "right": MIN_DOLLAR_VOLUME},
            {"left": "average_volume_30d_calc", "operation": "greater", "right": MIN_AVG_VOLUME},
            {"left": "is_primary", "operation": "equal", "right": True},
        ],
        "ignore_unknown_fields": False,
        "options": {"lang": "en"},
        "range": [0, page_size],
        "sort": {"sortBy": "market_cap_basic", "sortOrder": "desc"},
        "symbols": {},
        "markets": ["america"],
    }

    response = requests.post(SCANNER_URL, json=payload, timeout=60)
    response.raise_for_status()

    records: list[dict[str, Any]] = []
    for row in response.json().get("data", []):
        values = row.get("d", [])
        if len(values) != len(COLUMNS):
            continue
        record = dict(zip(COLUMNS, values))
        record["ticker"] = record.pop("name")
        records.append(record)
    return records


def top_percent_by(
    universe: list[dict[str, Any]], column: str, top_percent: float
) -> list[dict[str, Any]]:
    """The best `top_percent` of `universe` ranked by `column`, highest first."""
    ranked = [row for row in universe if isinstance(row.get(column), (int, float))]
    ranked.sort(key=lambda row: row[column], reverse=True)
    keep = max(1, round(len(ranked) * top_percent / 100)) if ranked else 0
    return ranked[:keep]


def select_momentum_leaders(
    universe: list[dict[str, Any]],
    top_percent: float = DEFAULT_TOP_PERCENT,
    horizons: list[str] | None = None,
) -> tuple[list[str], dict[str, list[str]]]:
    """
    Merge the top slice of each performance horizon into one deduplicated list.

    Returns the working list and, for transparency, the per-horizon selections
    that produced it.
    """
    horizons = horizons or PERFORMANCE_HORIZONS
    per_horizon: dict[str, list[str]] = {}
    working: list[str] = []
    seen: set[str] = set()

    for horizon in horizons:
        leaders = top_percent_by(universe, horizon, top_percent)
        per_horizon[horizon] = [row["ticker"] for row in leaders]
        for row in leaders:
            if row["ticker"] not in seen:
                seen.add(row["ticker"])
                working.append(row["ticker"])

    return working, per_horizon
