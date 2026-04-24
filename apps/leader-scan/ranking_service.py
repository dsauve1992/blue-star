"""
Leader Scan ranking service.

Given a raw universe from TradingView Screener, apply liquidity and ADR
filters, compute percentile ranks on 1M/3M/6M performance, and return the
top 2% by RS_score = max(rank_1M, rank_3M, rank_6M).

The ranking window (`max` of three percentiles) is a deliberate choice
inherited from Qullamaggie — see Leader-Scan-Spec.md for rationale.
"""

from dataclasses import dataclass, asdict
from typing import Any

SMALL_SIZE_PRICE_THRESHOLD = 5.0
DEFAULT_MIN_DOLLAR_VOLUME = 5_000_000.0
DEFAULT_MIN_ADR = 3.0
LEADER_PERCENTILE = 0.98


@dataclass
class LeaderRecord:
    ticker: str
    exchange: str
    sector: str
    perf_1m: float
    perf_3m: float
    perf_6m: float
    rank_1m: float
    rank_3m: float
    rank_6m: float
    rs_score: float
    adr_20: float
    dollar_volume_20: float
    top_1m_flag: bool
    top_3m_flag: bool
    top_6m_flag: bool
    small_size_flag: bool


def _as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    if result != result:  # NaN
        return None
    return result


def _percentile_ranks(values: list[float]) -> list[float]:
    """Return percentile rank in [0, 1] for each value, ties share rank."""
    n = len(values)
    if n == 0:
        return []
    indexed = sorted(range(n), key=lambda i: values[i])
    ranks = [0.0] * n
    i = 0
    while i < n:
        j = i
        while j + 1 < n and values[indexed[j + 1]] == values[indexed[i]]:
            j += 1
        avg_rank = (i + j) / 2.0
        percentile = avg_rank / (n - 1) if n > 1 else 1.0
        for k in range(i, j + 1):
            ranks[indexed[k]] = percentile
        i = j + 1
    return ranks


def filter_universe(
    universe: list[dict[str, Any]],
    min_dollar_volume: float = DEFAULT_MIN_DOLLAR_VOLUME,
    min_adr: float = DEFAULT_MIN_ADR,
) -> list[dict[str, Any]]:
    """
    Keep rows with liquidity >= min_dollar_volume, ADR >= min_adr, and all
    three performance windows present (excludes IPOs < 126 days).
    """
    kept: list[dict[str, Any]] = []
    for row in universe:
        close = _as_float(row.get("close"))
        avg_volume = _as_float(row.get("average_volume_10d_calc"))
        adr = _as_float(row.get("ADR"))
        perf_1m = _as_float(row.get("Perf.1M"))
        perf_3m = _as_float(row.get("Perf.3M"))
        perf_6m = _as_float(row.get("Perf.6M"))

        if None in (close, avg_volume, adr, perf_1m, perf_3m, perf_6m):
            continue
        if adr < min_adr:
            continue
        if close * avg_volume < min_dollar_volume:
            continue

        row["_close"] = close
        row["_avg_volume"] = avg_volume
        row["_adr"] = adr
        row["_perf_1m"] = perf_1m
        row["_perf_3m"] = perf_3m
        row["_perf_6m"] = perf_6m
        kept.append(row)
    return kept


def rank_and_select_leaders(filtered: list[dict[str, Any]]) -> list[LeaderRecord]:
    """Compute RS_score on the filtered universe and return the top 2%."""
    if not filtered:
        return []

    perf_1m = [r["_perf_1m"] for r in filtered]
    perf_3m = [r["_perf_3m"] for r in filtered]
    perf_6m = [r["_perf_6m"] for r in filtered]

    rank_1m = _percentile_ranks(perf_1m)
    rank_3m = _percentile_ranks(perf_3m)
    rank_6m = _percentile_ranks(perf_6m)

    records: list[LeaderRecord] = []
    for idx, row in enumerate(filtered):
        r1, r3, r6 = rank_1m[idx], rank_3m[idx], rank_6m[idx]
        rs = max(r1, r3, r6)
        if rs < LEADER_PERCENTILE:
            continue

        dollar_volume = row["_close"] * row["_avg_volume"]
        records.append(
            LeaderRecord(
                ticker=row["ticker"],
                exchange=row.get("exchange", "") or "",
                sector=row.get("sector", "") or "",
                perf_1m=row["_perf_1m"] / 100.0,
                perf_3m=row["_perf_3m"] / 100.0,
                perf_6m=row["_perf_6m"] / 100.0,
                rank_1m=r1,
                rank_3m=r3,
                rank_6m=r6,
                rs_score=rs,
                adr_20=row["_adr"],
                dollar_volume_20=dollar_volume,
                top_1m_flag=r1 >= LEADER_PERCENTILE,
                top_3m_flag=r3 >= LEADER_PERCENTILE,
                top_6m_flag=r6 >= LEADER_PERCENTILE,
                small_size_flag=row["_close"] < SMALL_SIZE_PRICE_THRESHOLD,
            )
        )

    records.sort(key=lambda r: r.rs_score, reverse=True)
    return records


def record_to_dict(record: LeaderRecord) -> dict[str, Any]:
    return asdict(record)
