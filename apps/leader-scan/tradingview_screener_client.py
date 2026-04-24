"""
TradingView Stock Screener client.

Posts a scanner request to scanner.tradingview.com/america/scan and returns
the full US universe with the columns needed to compute the Leader Scan:
performance 1M/3M/6M, ADR, 20-day average volume, close, sector, exchange.
"""

from typing import Any
import requests

SCANNER_URL = "https://scanner.tradingview.com/america/scan"

COLUMNS = [
    "name",
    "description",
    "exchange",
    "sector",
    "close",
    "volume",
    "average_volume_10d_calc",
    "ADR",
    "Perf.1M",
    "Perf.3M",
    "Perf.6M",
]


def fetch_universe(min_price: float = 5.0, page_size: int = 5000) -> list[dict[str, Any]]:
    """
    Fetch the US common stock universe from TradingView Screener.

    Filters applied server-side:
      - Type = common stock (excludes ETFs, funds, preferred shares)
      - Exchange in (NYSE, NASDAQ, AMEX)
      - Close price > 0 (ensures we have a quote)

    Stocks below `min_price` are kept and tagged later as `small_size` — the
    price filter is applied in the ranking stage, not here.
    """
    payload = {
        "filter": [
            {"left": "type", "operation": "equal", "right": "stock"},
            {"left": "subtype", "operation": "equal", "right": "common"},
            {"left": "exchange", "operation": "in_range", "right": ["NYSE", "NASDAQ", "AMEX"]},
            {"left": "close", "operation": "greater", "right": 0},
        ],
        "options": {"lang": "en"},
        "markets": ["america"],
        "symbols": {"query": {"types": []}, "tickers": []},
        "columns": COLUMNS,
        "sort": {"sortBy": "market_cap_basic", "sortOrder": "desc"},
        "range": [0, page_size],
    }

    response = requests.post(SCANNER_URL, json=payload, timeout=60)
    response.raise_for_status()
    data = response.json()

    rows = data.get("data", [])
    results: list[dict[str, Any]] = []
    for row in rows:
        values = row.get("d", [])
        if len(values) != len(COLUMNS):
            continue
        record = dict(zip(COLUMNS, values))
        record["ticker"] = record.pop("name")
        results.append(record)

    return results
