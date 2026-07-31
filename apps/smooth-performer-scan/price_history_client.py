"""
Yahoo Finance daily price history, batched and cached.

yfinance downloads many tickers per HTTP round trip, so tickers are fetched in
batches rather than one at a time. Each batch is cached to Parquet under data/
so re-running the scan after a scoring change costs seconds instead of minutes.

auto_adjust=True is required, not cosmetic: on raw prices a 2:1 split halves the
close overnight, which reads as a violent trend break and would inflate the
bad-day count for every window containing it.
"""

import hashlib
import sys
from pathlib import Path

import pandas as pd
import yfinance as yf

CACHE_DIR = Path(__file__).parent / "data"


CACHE_SCHEMA = "v2-close-volume"


def _cache_path(tickers: list[str], start: str, end: str) -> Path:
    key = "|".join(sorted(tickers)) + f"|{start}|{end}|{CACHE_SCHEMA}"
    digest = hashlib.sha256(key.encode()).hexdigest()[:16]
    return CACHE_DIR / f"bars-{digest}.parquet"


def to_yahoo_symbol(ticker: str) -> str:
    """
    TradingView spells dual-class shares BF.A / MOG.B; Yahoo expects BF-A / MOG-B.
    Without this every dual-class name silently drops out of the scan.
    """
    return ticker.replace(".", "-")


def _download_batch(tickers: list[str], start: str, end: str) -> pd.DataFrame:
    """
    Returns a frame with a (ticker, field) column MultiIndex holding Close and
    Volume. Volume is needed to judge liquidity during each scored window rather
    than from a present-day snapshot.
    """
    symbols = {to_yahoo_symbol(t): t for t in tickers}
    frame = yf.download(
        list(symbols),
        start=start,
        end=end,
        interval="1d",
        auto_adjust=True,
        group_by="ticker",
        threads=True,
        progress=False,
    )
    if frame is None or frame.empty:
        return pd.DataFrame()

    columns: dict[tuple[str, str], pd.Series] = {}
    available = set(frame.columns.get_level_values(0))
    for symbol, ticker in symbols.items():
        if symbol not in available:
            continue
        close = frame[symbol]["Close"].dropna()
        if close.empty:
            continue
        columns[(ticker, "Close")] = close
        columns[(ticker, "Volume")] = frame[symbol]["Volume"].reindex(close.index)

    if not columns:
        return pd.DataFrame()

    result = pd.DataFrame(columns)
    result.columns = pd.MultiIndex.from_tuples(result.columns)
    return result


def fetch_close_history(
    tickers: list[str],
    start: str,
    end: str,
    batch_size: int = 100,
    refresh: bool = False,
    quiet: bool = False,
) -> pd.DataFrame:
    """
    Daily adjusted closes for `tickers`, one column per ticker.

    Tickers Yahoo has no data for (delisted, renamed, bad symbol) are simply
    absent from the result — yfinance keeps their column but leaves it empty, so
    they are dropped rather than aborting the batch.
    """
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    batches = [tickers[i : i + batch_size] for i in range(0, len(tickers), batch_size)]
    frames: list[pd.DataFrame] = []

    for index, batch in enumerate(batches, start=1):
        path = _cache_path(batch, start, end)
        if path.exists() and not refresh:
            cached = pd.read_parquet(path)
            if cached.columns.nlevels == 2:
                frames.append(cached)
                if not quiet:
                    print(f"  batch {index}/{len(batches)}: cached", file=sys.stderr)
                continue
            path.unlink()

        try:
            frame = _download_batch(batch, start, end)
        except Exception as error:
            print(f"  batch {index}/{len(batches)}: FAILED ({error})", file=sys.stderr)
            continue

        if frame.empty:
            if not quiet:
                print(f"  batch {index}/{len(batches)}: no data", file=sys.stderr)
            continue

        frame.to_parquet(path)
        frames.append(frame)
        if not quiet:
            print(
                f"  batch {index}/{len(batches)}: "
                f"{len(frame.columns.get_level_values(0).unique())} tickers, "
                f"{len(frame)} bars",
                file=sys.stderr,
            )

    if not frames:
        return pd.DataFrame()

    return pd.concat(frames, axis=1).sort_index()
