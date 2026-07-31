#!/usr/bin/env python3
"""
Smooth Performer Scan — CLI entry point.

Finds the best 6-month advances of the last N years where the trend stack
EMA10 > EMA20 > SMA50 stayed intact on most days, scoring each rolling window by

    score = perf * alignment_pct

Writes one row per ticker (its single best window) to CSV, ranked by score.

Usage:
    python main.py --years 10 --top 200 --out results.csv
    python main.py --tickers NVDA,AAPL,MSFT --years 10 --out /tmp/sample.csv
    python main.py --universe-file my-tickers.txt --refresh
"""

import argparse
import csv
import sys
from dataclasses import fields
from datetime import date, timedelta

from price_history_client import fetch_close_history
from smoothness_service import (
    DEFAULT_MIN_ALIGNMENT,
    DEFAULT_MIN_DOLLAR_VOLUME,
    DEFAULT_RUN_GAP_DAYS,
    MIN_BARS,
    WindowRecord,
    best_window,
    best_windows_per_run,
    find_corruption,
    record_to_dict,
)
from universe_client import fetch_universe, read_universe_file


def _resolve_tickers(args) -> list[str]:
    if args.tickers:
        return [t.strip().upper() for t in args.tickers.split(",") if t.strip()]
    if args.universe_file:
        return [r["ticker"] for r in read_universe_file(args.universe_file)]
    return [r["ticker"] for r in fetch_universe()]


def _write_csv(path: str, records: list[WindowRecord]) -> None:
    columns = [f.name for f in fields(WindowRecord)]
    with open(path, "w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        for record in records:
            writer.writerow(record_to_dict(record))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Smooth Performer Scan — best smooth 6-month advances"
    )
    parser.add_argument("--years", type=int, default=10)
    parser.add_argument("--top", type=int, default=0, help="0 keeps every ticker")
    parser.add_argument("--out", default="results.csv")
    parser.add_argument("--tickers", help="comma-separated list, bypasses the screener")
    parser.add_argument("--universe-file", help="file of tickers, one per line")
    parser.add_argument("--batch-size", type=int, default=100)
    parser.add_argument(
        "--min-dollar-volume",
        type=float,
        default=DEFAULT_MIN_DOLLAR_VOLUME,
        help="median close*volume required within the scored window; 0 disables",
    )
    parser.add_argument(
        "--min-alignment",
        type=float,
        default=DEFAULT_MIN_ALIGNMENT,
        help="fraction of window days the trend stack must hold; 0 disables",
    )
    parser.add_argument(
        "--per-run",
        action="store_true",
        help="one row per distinct advance instead of one per ticker",
    )
    parser.add_argument(
        "--run-gap-days",
        type=int,
        default=DEFAULT_RUN_GAP_DAYS,
        help="gap in window_end that starts a new run under --per-run",
    )
    parser.add_argument("--refresh", action="store_true", help="ignore the Parquet cache")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    end = date.today()
    start = end - timedelta(days=365 * args.years + 90)

    if not args.quiet:
        print(f"Smooth Performer Scan — {start} to {end}", file=sys.stderr)

    tickers = _resolve_tickers(args)
    if not tickers:
        print("No tickers to scan.", file=sys.stderr)
        return 1
    if not args.quiet:
        print(f"Universe: {len(tickers)} tickers", file=sys.stderr)

    bars = fetch_close_history(
        tickers,
        start.isoformat(),
        end.isoformat(),
        batch_size=args.batch_size,
        refresh=args.refresh,
        quiet=args.quiet,
    )
    if bars.empty:
        print("No price history returned.", file=sys.stderr)
        return 1

    records: list[WindowRecord] = []
    too_short = 0
    too_thin = 0
    too_choppy = 0
    rejected: list[tuple[str, str]] = []
    for ticker in bars.columns.get_level_values(0).unique():
        close = bars[(ticker, "Close")].dropna()
        if len(close) < MIN_BARS:
            too_short += 1
            continue

        reason = find_corruption(close)
        if reason is not None:
            rejected.append((ticker, reason))
            continue

        volume = bars[(ticker, "Volume")]
        if args.per_run:
            found = best_windows_per_run(
                ticker,
                close,
                volume=volume,
                min_dollar_volume=args.min_dollar_volume,
                min_alignment=args.min_alignment,
                screen_corruption=False,
                run_gap_days=args.run_gap_days,
            )
        else:
            record = best_window(
                ticker,
                close,
                volume=volume,
                min_dollar_volume=args.min_dollar_volume,
                min_alignment=args.min_alignment,
                screen_corruption=False,
            )
            found = [record] if record is not None else []

        if not found:
            liquid_only = best_window(
                ticker,
                close,
                volume=volume,
                min_dollar_volume=args.min_dollar_volume,
                screen_corruption=False,
            )
            if liquid_only is None:
                too_thin += 1
            else:
                too_choppy += 1
            continue
        records.extend(found)

    records.sort(key=lambda r: r.score, reverse=True)
    if args.top > 0:
        records = records[: args.top]

    _write_csv(args.out, records)

    if not args.quiet:
        unit = "runs" if args.per_run else "tickers"
        distinct = len({r.ticker for r in records})
        print(
            f"Scored {len(records)} {unit} across {distinct} tickers "
            f"({too_short} skipped for < {MIN_BARS} bars, "
            f"{len(rejected)} rejected as corrupt, "
            f"{too_thin} with no window over ${args.min_dollar_volume:,.0f}, "
            f"{too_choppy} with none over {args.min_alignment:.0%} alignment)"
            f" -> {args.out}",
            file=sys.stderr,
        )
        for ticker, reason in rejected[:10]:
            print(f"  rejected {ticker}: {reason}", file=sys.stderr)
        for record in records[:20]:
            print(
                f"  {record.ticker:<8} {record.window_start} to {record.window_end} "
                f"perf={record.perf:+.1%} bad={record.bad_days:>3} "
                f"streak={record.longest_bad_streak:>3} "
                f"$vol={record.dollar_volume / 1e6:>7.1f}M "
                f"score={record.score:.4f} ratio={record.ratio_score:.4f}",
                file=sys.stderr,
            )

    return 0


if __name__ == "__main__":
    sys.exit(main())
