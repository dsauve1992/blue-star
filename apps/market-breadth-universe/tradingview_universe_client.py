"""
TradingView Stock Screener client for the market-breadth universe.

Posts a scanner request to scanner.tradingview.com/global/scan using the
same endpoint, payload shape, and filter as the RS-rating screener
(apps/screener/rs_rating_service.py + apps/screener/screener_service.py):
US primary-listed common stock, close > $1, market cap > $300M, 30-day
average traded value > $5M. Only the ticker symbol is needed.
"""

from typing import Any
import requests

SCANNER_URL = "https://scanner.tradingview.com/global/scan"

COLUMNS = ["name"]

FILTERS: list[dict[str, Any]] = [
    {"left": "close", "operation": "greater", "right": 1},
    {"left": "market_cap_basic", "operation": "greater", "right": 300000000},
    {"left": "AvgValue.Traded_30d", "operation": "greater", "right": 5000000},
    {"left": "is_primary", "operation": "equal", "right": True},
    {"left": "type", "operation": "equal", "right": "stock"},
]


def fetch_universe(page_size: int = 10000) -> list[str]:
    """Fetch the market-breadth universe symbol list from TradingView Screener."""
    payload = {
        "columns": COLUMNS,
        "filter": FILTERS,
        "ignore_unknown_fields": False,
        "options": {"lang": "en"},
        "range": [0, page_size],
        "sort": {"sortBy": "market_cap_basic", "sortOrder": "desc"},
        "symbols": {},
        "markets": ["america"],
    }

    response = requests.post(SCANNER_URL, json=payload, timeout=60)
    response.raise_for_status()
    data = response.json()

    rows = data.get("data", [])
    symbols: list[str] = []
    for row in rows:
        values = row.get("d", [])
        if len(values) != len(COLUMNS):
            continue
        symbols.append(values[0])

    return symbols
