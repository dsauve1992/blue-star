#!/usr/bin/env python3
"""
Market Breadth Universe — CLI entry point.

Emits JSON on stdout describing the daily market-breadth universe: the
symbol list from the TradingView scanner filter shared with the RS-rating
screener (US primary-listed common stock, close > $1, market cap > $300M,
30-day average traded value > $5M).

Usage:
    python main.py --format json
"""

import argparse
import json
import sys
from datetime import date

from tradingview_universe_client import fetch_universe


def main() -> int:
    parser = argparse.ArgumentParser(description="Market Breadth Universe — daily symbol list")
    parser.add_argument("--format", choices=["json", "text"], default="json")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    if not args.quiet:
        print("Market Breadth Universe starting…", file=sys.stderr)

    symbols = fetch_universe()
    if not args.quiet:
        print(f"Fetched {len(symbols)} symbols from TradingView", file=sys.stderr)

    payload = {
        "scan_date": date.today().isoformat(),
        "universe_size": len(symbols),
        "symbols": symbols,
    }

    if args.format == "json":
        json.dump(payload, sys.stdout)
        sys.stdout.write("\n")
    else:
        for symbol in symbols:
            print(symbol)

    return 0


if __name__ == "__main__":
    sys.exit(main())
