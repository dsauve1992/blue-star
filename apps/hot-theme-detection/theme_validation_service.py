"""
Theme validation and scoring — Stages 3 and 4 of the pipeline.

Pure computation: no network, no file I/O. Price data is passed in as a
dict[str, pd.Series] of daily closes so this module stays trivially
unit-testable against synthetic series.

Breadth is the only gate: a theme needs >= MIN_BREADTH tickers or it dissolves,
and its tickers become lone wolves alongside those the LLM already proposed.

Correlation is measured but, by default, does not gate. Measuring it across
real themes showed it discriminates theme *mechanism*, not theme validity: a
cohort driven by one external event co-moves at 0.7+, while announced-takeover
targets co-move at roughly zero because each is pinned to its own offer price —
decoupling by design, not a failed narrative. Gating on it would have dissolved
valid themes for the wrong reason, so `measure_correlation=True` records the
number for downstream consumers and `use_correlation=True` is retained for
callers who explicitly want the strict gate.
"""

from dataclasses import dataclass, field

import pandas as pd

MIN_BREADTH = 3
DEFAULT_CORRELATION_WINDOW_DAYS = 10
DEFAULT_CORRELATION_THRESHOLD = 0.4
DEFAULT_CORRELATION_WEIGHT = 0.5


@dataclass
class ProposedTheme:
    name: str
    catalyst: str
    tickers: list[str]


@dataclass
class ValidatedTheme:
    name: str
    catalyst: str
    tickers: list[str]
    breadth: int
    average_correlation: float | None
    score: float


@dataclass
class ValidationResult:
    themes: list[ValidatedTheme]
    lone_wolves: list[str]
    dissolved: list[str] = field(default_factory=list)


def average_pairwise_correlation(
    tickers: list[str],
    price_history: dict[str, pd.Series],
    window_days: int = DEFAULT_CORRELATION_WINDOW_DAYS,
) -> float | None:
    """
    Average pairwise Pearson correlation of daily returns over the trailing
    `window_days` trading days.

    Returns None when fewer than 2 tickers have enough price history to
    compute a return series — correlation is undefined for a single series,
    and a theme missing all its price data cannot be scored on this axis.
    Tickers with missing or too-short history are silently excluded rather
    than failing the whole theme; the average is over whatever pairs remain.
    """
    returns: dict[str, pd.Series] = {}
    for ticker in tickers:
        closes = price_history.get(ticker)
        if closes is None or len(closes) < window_days + 1:
            continue
        windowed = closes.tail(window_days + 1)
        returns[ticker] = windowed.pct_change().dropna()

    if len(returns) < 2:
        return None

    frame = pd.DataFrame(returns)
    corr = frame.corr()

    pairs = []
    columns = corr.columns
    for i in range(len(columns)):
        for j in range(i + 1, len(columns)):
            value = corr.iloc[i, j]
            if pd.notna(value):
                pairs.append(value)

    if not pairs:
        return None
    return float(sum(pairs) / len(pairs))


def score_theme(breadth: int, average_correlation: float | None, use_correlation: bool) -> float:
    """
    v1: score is breadth alone.
    v2 (`use_correlation=True`): weighted combination of breadth and average
    correlation, so a wide theme with weak co-movement still outranks a
    narrow one but a strongly-correlated theme gets credit beyond headcount.
    """
    if not use_correlation or average_correlation is None:
        return float(breadth)
    return breadth + DEFAULT_CORRELATION_WEIGHT * average_correlation * breadth


def validate_themes(
    proposed_themes: list[ProposedTheme],
    proposed_lone_wolves: list[str],
    price_history: dict[str, pd.Series] | None = None,
    min_breadth: int = MIN_BREADTH,
    use_correlation: bool = False,
    measure_correlation: bool = False,
    correlation_window_days: int = DEFAULT_CORRELATION_WINDOW_DAYS,
    correlation_threshold: float = DEFAULT_CORRELATION_THRESHOLD,
) -> ValidationResult:
    """
    Gate every proposed theme on breadth, dissolving failures into lone wolves,
    then score and rank what survives.

    `measure_correlation` records each surviving theme's average pairwise
    return correlation without gating on it. `use_correlation` additionally
    dissolves themes that fail `correlation_threshold`, treating missing price
    data as a failure — a strict mode kept for callers who want it, but not the
    default, because low correlation often reflects a theme's mechanism rather
    than a bad narrative.
    """
    price_history = price_history or {}
    validated: list[ValidatedTheme] = []
    lone_wolves = list(proposed_lone_wolves)
    dissolved: list[str] = []

    for theme in proposed_themes:
        breadth = len(theme.tickers)

        if breadth < min_breadth:
            lone_wolves.extend(theme.tickers)
            dissolved.append(theme.name)
            continue

        average_correlation = None
        if use_correlation or measure_correlation:
            average_correlation = average_pairwise_correlation(
                theme.tickers, price_history, correlation_window_days
            )

        if use_correlation:
            if average_correlation is None or average_correlation < correlation_threshold:
                lone_wolves.extend(theme.tickers)
                dissolved.append(theme.name)
                continue

        score = score_theme(breadth, average_correlation, use_correlation)
        validated.append(
            ValidatedTheme(
                name=theme.name,
                catalyst=theme.catalyst,
                tickers=list(theme.tickers),
                breadth=breadth,
                average_correlation=average_correlation,
                score=score,
            )
        )

    validated.sort(key=lambda t: t.score, reverse=True)
    return ValidationResult(themes=validated, lone_wolves=sorted(set(lone_wolves)), dissolved=dissolved)
