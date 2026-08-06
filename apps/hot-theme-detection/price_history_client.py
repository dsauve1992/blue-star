"""
Daily close history for the correlation check, batched and cached.

Trimmed from apps/smooth-performer-scan/price_history_client.py: same Parquet
caching and TradingView-to-Yahoo symbol translation, with volume dropped since
correlation only needs closes.

auto_adjust=True is required, not cosmetic: on raw prices a split reads as a
violent overnight move and would corrupt the return series a correlation
check depends on.
"""

import hashlib
import sys
from pathlib import Path

import pandas as pd
import yfinance as yf

CACHE_DIR = Path(__file__).parent / "data" / "prices"

CACHE_SCHEMA = "v1-close"


def _cache_path(tickers: list[str], start: str, end: str) -> Path:
    key = "|".join(sorted(tickers)) + f"|{start}|{end}|{CACHE_SCHEMA}"
    digest = hashlib.sha256(key.encode()).hexdigest()[:16]
    return CACHE_DIR / f"closes-{digest}.parquet"


def to_yahoo_symbol(ticker: str) -> str:
    """TradingView spells dual-class shares BF.A / MOG.B; Yahoo expects BF-A / MOG-B."""
    return ticker.replace(".", "-")


def _download_batch(tickers: list[str], start: str, end: str) -> pd.DataFrame:
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

    columns: dict[str, pd.Series] = {}
    available = set(frame.columns.get_level_values(0))
    for symbol, ticker in symbols.items():
        if symbol not in available:
            continue
        close = frame[symbol]["Close"].dropna()
        if close.empty:
            continue
        columns[ticker] = close

    return pd.DataFrame(columns)


def fetch_close_history(
    tickers: list[str],
    start: str,
    end: str,
    batch_size: int = 100,
    refresh: bool = False,
    quiet: bool = False,
) -> dict[str, pd.Series]:
    """
    Daily adjusted closes for `tickers`, one Series per ticker.

    Tickers Yahoo has no data for are simply absent from the result rather
    than aborting the batch.
    """
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    batches = [tickers[i : i + batch_size] for i in range(0, len(tickers), batch_size)]
    frames: list[pd.DataFrame] = []

    for index, batch in enumerate(batches, start=1):
        path = _cache_path(batch, start, end)
        if path.exists() and not refresh:
            frames.append(pd.read_parquet(path))
            if not quiet:
                print(f"  price batch {index}/{len(batches)}: cached", file=sys.stderr)
            continue

        try:
            frame = _download_batch(batch, start, end)
        except Exception as error:
            print(f"  price batch {index}/{len(batches)}: FAILED ({error})", file=sys.stderr)
            continue

        if frame.empty:
            if not quiet:
                print(f"  price batch {index}/{len(batches)}: no data", file=sys.stderr)
            continue

        frame.to_parquet(path)
        frames.append(frame)
        if not quiet:
            print(
                f"  price batch {index}/{len(batches)}: {len(frame.columns)} tickers, "
                f"{len(frame)} bars",
                file=sys.stderr,
            )

    if not frames:
        return {}

    combined = pd.concat(frames, axis=1).sort_index()
    return {ticker: combined[ticker].dropna() for ticker in combined.columns}
