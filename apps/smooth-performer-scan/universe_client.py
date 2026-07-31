"""
TradingView Stock Screener client.

Returns the US common stock universe (ticker, exchange, sector) to scan. Same
request shape as apps/leader-scan/tradingview_screener_client.py, with the
columns trimmed to what this scan needs.

No liquidity filter is applied: the scan looks at the full listed universe.
"""

from typing import Any

import requests

SCANNER_URL = "https://scanner.tradingview.com/america/scan"

COLUMNS = ["name", "exchange", "sector", "close"]


def fetch_universe(page_size: int = 20000) -> list[dict[str, Any]]:
    """
    Fetch US common stocks from TradingView Screener.

    Filters applied server-side:
      - Type = common stock (excludes ETFs, funds, preferred shares)
      - Exchange in (NYSE, NASDAQ, AMEX)
      - Close price > 0 (ensures we have a quote)
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

    results: list[dict[str, Any]] = []
    for row in response.json().get("data", []):
        values = row.get("d", [])
        if len(values) != len(COLUMNS):
            continue
        record = dict(zip(COLUMNS, values))
        record["ticker"] = record.pop("name")
        results.append(record)

    return results


def read_universe_file(path: str) -> list[dict[str, Any]]:
    """Read tickers from a file, one per line. Blank lines and '#' comments skipped."""
    records: list[dict[str, Any]] = []
    with open(path) as handle:
        for line in handle:
            ticker = line.strip()
            if not ticker or ticker.startswith("#"):
                continue
            records.append({"ticker": ticker, "exchange": "", "sector": "", "close": None})
    return records
