#!/usr/bin/env python3
"""
Stock Classifier - Fetches GICS-relevant classification fields from yfinance.

Usage:
    python classifier.py <TICKER>

Output (stdout, single JSON line):
    {"ticker": "AAPL", "sector": "Technology", "industry": "Consumer Electronics", "industryKey": "consumer-electronics"}

If yfinance has no data for the ticker, all fields except `ticker` are empty strings.
If the fetch itself fails (transport error, rate limit), the script exits non-zero with a traceback on stderr.
"""
import json
import sys

import yfinance as yf


def classify(symbol: str) -> dict:
    info = yf.Ticker(symbol).info

    return {
        "ticker": symbol,
        "sector": info.get("sector", "") or "",
        "industry": info.get("industry", "") or "",
        "industryKey": info.get("industryKey", "") or "",
    }


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: classifier.py <TICKER>", file=sys.stderr)
        return 2

    print(json.dumps(classify(sys.argv[1])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
