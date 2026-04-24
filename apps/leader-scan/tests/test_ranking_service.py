"""Unit tests for ranking_service."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from ranking_service import (
    DEFAULT_MIN_ADR,
    DEFAULT_MIN_DOLLAR_VOLUME,
    LEADER_PERCENTILE,
    filter_universe,
    rank_and_select_leaders,
)


def _row(
    ticker: str,
    close: float = 20.0,
    avg_volume: float = 1_000_000,
    adr: float = 5.0,
    perf_1m: float = 0.0,
    perf_3m: float = 0.0,
    perf_6m: float = 0.0,
    sector: str = "Technology",
    exchange: str = "NASDAQ",
) -> dict:
    return {
        "ticker": ticker,
        "exchange": exchange,
        "sector": sector,
        "close": close,
        "volume": avg_volume,
        "average_volume_10d_calc": avg_volume,
        "ADR": adr,
        "Perf.1M": perf_1m,
        "Perf.3M": perf_3m,
        "Perf.6M": perf_6m,
    }


class TestFilterUniverse:
    def test_drops_rows_with_low_adr(self):
        rows = [_row("LOWADR", adr=2.0), _row("OKADR", adr=5.0)]
        filtered = filter_universe(rows)
        assert [r["ticker"] for r in filtered] == ["OKADR"]

    def test_drops_rows_with_low_dollar_volume(self):
        rows = [
            _row("ILLIQUID", close=1.0, avg_volume=1000),  # $1k < $5M
            _row("LIQUID", close=20.0, avg_volume=1_000_000),  # $20M > $5M
        ]
        filtered = filter_universe(rows)
        assert [r["ticker"] for r in filtered] == ["LIQUID"]

    def test_drops_rows_with_missing_performance(self):
        row = _row("NOPERF")
        row["Perf.6M"] = None
        filtered = filter_universe([row])
        assert filtered == []

    def test_custom_thresholds_are_respected(self):
        rows = [_row("MID", close=10.0, avg_volume=600_000, adr=4.0)]  # $6M, ADR 4
        assert len(filter_universe(rows, min_dollar_volume=5_000_000, min_adr=3.0)) == 1
        assert len(filter_universe(rows, min_dollar_volume=10_000_000, min_adr=3.0)) == 0
        assert len(filter_universe(rows, min_dollar_volume=5_000_000, min_adr=5.0)) == 0


class TestRankAndSelect:
    def test_empty_input_returns_empty(self):
        assert rank_and_select_leaders([]) == []

    def test_rs_score_is_max_of_three_ranks(self):
        rows = [
            _row(f"T{i}", perf_1m=i * 1.0, perf_3m=0.0, perf_6m=0.0)
            for i in range(100)
        ]
        filtered = filter_universe(rows)
        leaders = rank_and_select_leaders(filtered)
        top = next(l for l in leaders if l.ticker == "T99")
        assert top.rank_1m == 1.0
        assert top.rs_score == 1.0
        assert top.top_1m_flag is True
        assert top.top_3m_flag is False

    def test_leader_mature_captured_by_6m_window(self):
        rows = [_row(f"T{i}", perf_1m=0.0, perf_3m=0.0, perf_6m=i * 1.0) for i in range(100)]
        filtered = filter_universe(rows)
        leaders = rank_and_select_leaders(filtered)
        top = next(l for l in leaders if l.ticker == "T99")
        assert top.top_6m_flag is True
        assert top.top_1m_flag is False
        assert top.rs_score == 1.0

    def test_small_size_flag_when_price_under_5(self):
        rows = [_row(f"T{i}", close=20.0, avg_volume=1_000_000, perf_6m=i) for i in range(50)]
        rows.append(_row("PENNY", close=3.0, avg_volume=5_000_000, perf_6m=100))  # $15M
        filtered = filter_universe(rows)
        leaders = rank_and_select_leaders(filtered)
        penny = next(l for l in leaders if l.ticker == "PENNY")
        assert penny.small_size_flag is True

    def test_only_top_2_percent_kept(self):
        rows = [_row(f"T{i}", perf_1m=i) for i in range(100)]
        filtered = filter_universe(rows)
        leaders = rank_and_select_leaders(filtered)
        for l in leaders:
            assert l.rs_score >= LEADER_PERCENTILE

    def test_results_sorted_by_rs_score_descending(self):
        rows = [_row(f"T{i}", perf_1m=i) for i in range(200)]
        filtered = filter_universe(rows)
        leaders = rank_and_select_leaders(filtered)
        scores = [l.rs_score for l in leaders]
        assert scores == sorted(scores, reverse=True)

    def test_percentage_converted_to_decimal(self):
        rows = [_row(f"T{i}", perf_1m=10.0 * i) for i in range(100)]
        filtered = filter_universe(rows)
        leaders = rank_and_select_leaders(filtered)
        top = next(l for l in leaders if l.ticker == "T99")
        assert top.perf_1m == 9.9  # 990% / 100


class TestDefaults:
    def test_defaults_match_spec(self):
        assert DEFAULT_MIN_DOLLAR_VOLUME == 5_000_000
        assert DEFAULT_MIN_ADR == 3.0
        assert LEADER_PERCENTILE == 0.98
