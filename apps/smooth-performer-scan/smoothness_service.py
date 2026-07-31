"""
Smoothness scoring service.

Pure computation: no network, no file I/O. Given a daily close series, scores
every rolling 6-month window by

    score = perf * alignment_pct

where `perf` is the close-to-close return over the window and `alignment_pct` is
the fraction of days on which the trend stack EMA10 > EMA20 > SMA50 was intact.
A high score means a large advance earned while the stack stayed aligned — a
smooth ascension rather than a choppy one.

Both terms are ratios, so the score does not depend on WINDOW_DAYS and the
penalty for a bad day is linear: one bad day out of 126 costs 0.8%.

`ratio_score = perf / (bad_days + 1)` is retained as a diagnostic only. It was
the original formulation and it ranks badly, because dividing a ratio by a count
makes the penalty hyperbolic in the wrong place: 0 -> 1 bad days halves the
score while 10 -> 11 costs 8%. That let a +101% flawless window (1.01) outrank a
+1000% window with 10 bad days (10.0 / 11 = 0.909) — 92% alignment scored below
a move a tenth the size. In practice it behaved as a perfection filter rather
than a smoothness ranking.

EMAs use `adjust=False` — the standard recursive form, matching TradingView's
EMA10/EMA20. This deliberately differs from apps/screener/technical_analysis.py,
which relies on pandas' `adjust=True` default. Under `adjust=True` the EMA is a
finite weighted mean that emits a value from the very first bar, so early EMA10
and EMA20 are both close to the running average and their crossover carries no
information. That is harmless for a spot check but would corrupt a day-count.
"""

from dataclasses import dataclass, asdict
from typing import Any

import pandas as pd

EMA_FAST_PERIOD = 10
EMA_SLOW_PERIOD = 20
SMA_PERIOD = 50
WINDOW_DAYS = 126
WARMUP_BARS = SMA_PERIOD
MIN_BARS = WARMUP_BARS + WINDOW_DAYS - 1

MAX_DAILY_MOVE = 9.0
MAX_WINDOW_PERF = 100.0
MIN_PRICE = 0.10
DEFAULT_MIN_DOLLAR_VOLUME = 5_000_000.0
DEFAULT_MIN_ALIGNMENT = 0.90
DEFAULT_RUN_GAP_DAYS = 45


@dataclass
class WindowRecord:
    ticker: str
    window_start: str
    window_end: str
    perf: float
    bad_days: int
    aligned_days: int
    alignment_pct: float
    longest_bad_streak: int
    dollar_volume: float
    score: float
    ratio_score: float


def compute_alignment(close: pd.Series) -> pd.Series:
    """
    Per-bar truth of EMA10 > EMA20 > SMA50.

    Returns an object-dtype Series holding True/False, and pd.NA for the bars
    where SMA50 is not yet seeded. Those bars are undefined rather than bad —
    counting a warm-up bar as a broken trend would penalise every ticker's
    earliest window for a data artefact.
    """
    ema_fast = close.ewm(span=EMA_FAST_PERIOD, adjust=False).mean()
    ema_slow = close.ewm(span=EMA_SLOW_PERIOD, adjust=False).mean()
    sma = close.rolling(window=SMA_PERIOD).mean()

    aligned = (ema_fast > ema_slow) & (ema_slow > sma)
    return aligned.where(sma.notna())


def find_corruption(close: pd.Series) -> str | None:
    """
    Reject a series whose adjusted history is not usable, returning a reason.

    Yahoo's adjusted closes do not reliably repair reverse splits: a 1-for-100
    reverse leaves a 10,000% overnight jump, which reads as a spectacular smooth
    advance and dominates the ranking. Observed live: PPCB spanning $0.01 to
    $2.06e11 with a single-day move of 6,249,900%, CHRD +25,733% in a day, HYFT
    +87,400%.

    MAX_DAILY_MOVE is set at +900% rather than something tighter because the
    distribution of worst-single-day moves across the universe is continuous:
    median 35%, p90 188%, p95 318%, p99 1548%. There is no clean gap to cut at,
    so the threshold is a judgment call. A 3-5x day is a real biotech binary
    event; a 10x day is not something any security actually does, so that is
    where the line sits. Tightening it to +100% rejected 899 of ~3,700 tickers,
    including legitimate names (MDGL +268% on FDA data, INSM +120%).
    """
    if (close <= 0).any():
        return "non-positive price"
    if close.max() / close.min() > 1e6:
        return "implausible price range"
    if close.median() < MIN_PRICE:
        return "sub-penny median price"

    moves = close.pct_change().abs()
    worst = moves.max()
    if pd.notna(worst) and worst > MAX_DAILY_MOVE:
        return f"{worst:.0%} single-day move on {moves.idxmax().date()}"
    return None


def _longest_streak(flags: pd.Series) -> pd.Series:
    """
    Rolling longest run of consecutive True values within each window.

    Implemented as a rolling apply because a run can start before the window
    opens, so the answer is not decomposable from per-bar state alone.
    """

    def longest(values) -> float:
        best = current = 0
        for value in values:
            if value:
                current += 1
                best = max(best, current)
            else:
                current = 0
        return float(best)

    return flags.rolling(window=WINDOW_DAYS).apply(longest, raw=True)


def score_windows(close: pd.Series, volume: pd.Series | None = None) -> pd.DataFrame:
    """
    Score every rolling WINDOW_DAYS window in the series.

    Returns one row per complete window with perf, bad_days, alignment
    diagnostics, `score` (perf * alignment_pct) and the superseded `ratio_score`.
    Windows overlapping the moving-average warm-up are dropped, so the first row
    starts at bar WARMUP_BARS - 1.

    When `volume` is supplied, each window also carries `dollar_volume`: the
    median of close * volume over that window's own days. Measuring liquidity
    inside the window rather than from a present-day snapshot is the point — a
    thinly traded name is not credited for a run nobody could have traded, and a
    stock that was liquid in 2018 is not penalised for having dried up since.
    The median resists the single blow-off-volume day that a mean would follow.

    Windows returning more than MAX_WINDOW_PERF are dropped too. A reverse split
    smeared across several sessions clears the per-day MAX_DAILY_MOVE check but
    still compounds to an impossible total: RGC scored +55,509% and BRTX
    +33,400% (reaching a $19,000 share price) with no single day above 410%. A
    window-level cap catches what a per-day cap cannot.
    """
    aligned = compute_alignment(close)

    seeded = aligned.iloc[WARMUP_BARS - 1 :]
    prices = close.iloc[WARMUP_BARS - 1 :]
    if len(prices) < WINDOW_DAYS:
        return pd.DataFrame(
            columns=[
                "window_start",
                "window_end",
                "perf",
                "bad_days",
                "aligned_days",
                "alignment_pct",
                "longest_bad_streak",
                "dollar_volume",
                "score",
                "ratio_score",
            ]
        )

    is_bad = (~seeded.astype(bool)).astype(float)
    bad_days = is_bad.rolling(window=WINDOW_DAYS).sum()
    base = prices.shift(WINDOW_DAYS - 1)
    perf = (prices / base.where(base > 0) - 1.0).replace([float("inf"), float("-inf")], pd.NA)
    longest_bad_streak = _longest_streak(is_bad.astype(bool))

    if volume is None:
        dollar_volume = pd.Series(float("nan"), index=prices.index)
    else:
        turnover = (prices * volume.reindex(prices.index)).astype(float)
        dollar_volume = turnover.rolling(window=WINDOW_DAYS).median()

    frame = pd.DataFrame(
        {
            "window_end": prices.index,
            "window_start": prices.index.to_series().shift(WINDOW_DAYS - 1).values,
            "perf": perf.values,
            "bad_days": bad_days.values,
            "longest_bad_streak": longest_bad_streak.values,
            "dollar_volume": dollar_volume.values,
        }
    ).dropna(subset=["perf", "bad_days", "window_start"])

    frame["bad_days"] = frame["bad_days"].astype(int)
    frame["longest_bad_streak"] = frame["longest_bad_streak"].astype(int)
    frame["aligned_days"] = WINDOW_DAYS - frame["bad_days"]
    frame["alignment_pct"] = frame["aligned_days"] / WINDOW_DAYS
    frame["score"] = frame["perf"] * frame["alignment_pct"]
    frame["ratio_score"] = frame["perf"] / (frame["bad_days"] + 1)

    frame = frame[frame["perf"] <= MAX_WINDOW_PERF]

    return frame.reset_index(drop=True)


def best_window(
    ticker: str,
    close: pd.Series,
    volume: pd.Series | None = None,
    min_dollar_volume: float = 0.0,
    min_alignment: float = 0.0,
    screen_corruption: bool = True,
) -> WindowRecord | None:
    """
    Highest-scoring window for one ticker.

    None when the history is too short, (unless disabled) fails the data-quality
    screen, or leaves no window clearing `min_dollar_volume` and
    `min_alignment`. Use `find_corruption` directly when the reason matters.

    Both floors are applied before the argmax, not after, so a ticker yields its
    best *qualifying* window rather than being dropped because its all-time best
    window happened while it was thin or choppy.

    `min_alignment` exists because the score's alignment term is too weak to
    police smoothness on its own: perf spans two orders of magnitude across the
    universe while alignment_pct is bounded in [0, 1], so a huge move with 50%
    alignment outranks a clean one less than half its size. Observed live: OCGN
    (+5,480%, 62 bad days, 50.8% aligned) ranked second, above NVAX (+2,656%,
    2 bad days, 98.4% aligned). Gating first makes smoothness a qualification
    and leaves the score to rank size of advance among the windows that pass.
    """
    frame = _qualifying_windows(
        close, volume, min_dollar_volume, min_alignment, screen_corruption
    )
    if frame is None or frame.empty:
        return None
    return _to_record(ticker, frame.loc[frame["score"].idxmax()])


def best_windows_per_run(
    ticker: str,
    close: pd.Series,
    volume: pd.Series | None = None,
    min_dollar_volume: float = 0.0,
    min_alignment: float = 0.0,
    screen_corruption: bool = True,
    run_gap_days: int = DEFAULT_RUN_GAP_DAYS,
) -> list[WindowRecord]:
    """
    One record per *distinct* advance, instead of one per ticker.

    Because windows slide a day at a time they overlap heavily: a single clean
    8-month trend yields dozens of qualifying windows that all describe the same
    advance shifted by a day or two. NVAX had 52, SNDK 117, DAC 141. Collapsing
    those to one row is right — but `best_window` collapses too far, hiding a
    stock's genuinely separate runs. DAC had clean advances in both 2021 and
    2026, five years apart, and only the 2021 one survived the argmax.

    Qualifying windows are clustered by gap in `window_end`: a break longer than
    `run_gap_days` starts a new run. Each cluster contributes its own
    highest-scoring window, so DAC yields two rows rather than 141 or 1.

    Returns [] when nothing qualifies, ordered by score descending.
    """
    frame = _qualifying_windows(
        close, volume, min_dollar_volume, min_alignment, screen_corruption
    )
    if frame is None or frame.empty:
        return []

    ordered = frame.sort_values("window_end")
    ends = pd.to_datetime(ordered["window_end"])
    run = (ends.diff().dt.days.fillna(0) > run_gap_days).cumsum()

    records = [
        _to_record(ticker, cluster.loc[cluster["score"].idxmax()])
        for _, cluster in ordered.groupby(run)
    ]
    records.sort(key=lambda r: r.score, reverse=True)
    return records


def _qualifying_windows(
    close: pd.Series,
    volume: pd.Series | None,
    min_dollar_volume: float,
    min_alignment: float,
    screen_corruption: bool,
) -> pd.DataFrame | None:
    if close is None or len(close) < MIN_BARS:
        return None
    if screen_corruption and find_corruption(close) is not None:
        return None

    frame = score_windows(close, volume)
    if min_dollar_volume > 0:
        frame = frame[frame["dollar_volume"] >= min_dollar_volume]
    if min_alignment > 0:
        frame = frame[frame["alignment_pct"] >= min_alignment]
    return frame


def _to_record(ticker: str, row: pd.Series) -> WindowRecord:
    return WindowRecord(
        ticker=ticker,
        window_start=_format_date(row["window_start"]),
        window_end=_format_date(row["window_end"]),
        perf=float(row["perf"]),
        bad_days=int(row["bad_days"]),
        aligned_days=int(row["aligned_days"]),
        alignment_pct=float(row["alignment_pct"]),
        longest_bad_streak=int(row["longest_bad_streak"]),
        dollar_volume=float(row["dollar_volume"]),
        score=float(row["score"]),
        ratio_score=float(row["ratio_score"]),
    )


def _format_date(value: Any) -> str:
    timestamp = pd.Timestamp(value)
    return timestamp.date().isoformat()


def record_to_dict(record: WindowRecord) -> dict[str, Any]:
    return asdict(record)
