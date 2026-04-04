"""
TradingView Chart Data Service
Fetches OHLCV candle data from TradingView via WebSocket.
Outputs JSON to stdout for consumption by the Node.js backend.

Usage:
    python tradingview_chart_service.py --symbol AAPL --exchange NASDAQ --interval D --bars 200
"""

import argparse
import json
import logging
import sys
from datetime import datetime, timezone

from tradingview_scraper.symbols.stream import Streamer

# Suppress library logging so only our JSON hits stdout
logging.disable(logging.CRITICAL)

# Map our interval names to tradingview-scraper's expected timeframe keys
# (see Streamer._add_symbol_to_sessions timeframe_map)
INTERVAL_MAP = {
    "1": "1m",
    "5": "5m",
    "15": "15m",
    "30": "30m",
    "60": "1h",
    "1h": "1h",
    "4h": "4h",
    "D": "1d",
    "1D": "1d",
    "1d": "1d",
    "W": "1w",
    "1W": "1w",
    "1wk": "1w",
    "M": "1M",
    "1M": "1M",
    "1mo": "1M",
}


def fetch_chart_data(symbol: str, exchange: str, interval: str, bars: int) -> dict:
    """Fetch OHLCV data from TradingView WebSocket using Streamer."""
    tv_timeframe = INTERVAL_MAP.get(interval, "1d")

    streamer = Streamer(export_result=True, export_type="json")
    result = streamer.stream(
        exchange=exchange,
        symbol=symbol,
        timeframe=tv_timeframe,
        numb_price_candles=bars,
    )

    if not result or "ohlc" not in result:
        raise ValueError(f"TradingView returned no data for {exchange}:{symbol}")

    ohlc_rows = result["ohlc"]
    if not ohlc_rows:
        raise ValueError(f"TradingView returned empty OHLC data for {exchange}:{symbol}")

    candles = []
    for row in ohlc_rows:
        ts = row["timestamp"]
        dt = datetime.fromtimestamp(ts, tz=timezone.utc)

        # For daily/weekly/monthly, use date string; for intraday use unix timestamp
        if tv_timeframe in ("1d", "1w", "1M"):
            time_value = dt.strftime("%Y-%m-%d")
        else:
            time_value = int(ts)

        candles.append({
            "time": time_value,
            "open": round(float(row["open"]), 4),
            "high": round(float(row["high"]), 4),
            "low": round(float(row["low"]), 4),
            "close": round(float(row["close"]), 4),
            "volume": int(float(row["volume"])),
        })

    return {
        "symbol": symbol,
        "exchange": exchange,
        "interval": interval,
        "candles": candles,
    }


def main():
    parser = argparse.ArgumentParser(description="Fetch TradingView OHLCV data")
    parser.add_argument("--symbol", required=True, help="Stock symbol (e.g. AAPL)")
    parser.add_argument("--exchange", required=True, help="Exchange (e.g. NASDAQ)")
    parser.add_argument("--interval", default="D", help="Interval: 1,5,15,60,D,W,M")
    parser.add_argument("--bars", type=int, default=200, help="Number of bars to fetch")
    args = parser.parse_args()

    try:
        data = fetch_chart_data(args.symbol, args.exchange, args.interval, args.bars)
        print(json.dumps(data))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
