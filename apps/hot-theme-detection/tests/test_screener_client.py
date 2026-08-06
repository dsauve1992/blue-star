import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from screener_client import select_momentum_leaders, top_percent_by


def row(ticker, **perf):
    record = {"ticker": ticker}
    record.update(perf)
    return record


class TestTopPercentBy:
    def test_keeps_best_slice_highest_first(self):
        universe = [row(f"T{i}", **{"Perf.1M": float(i)}) for i in range(100)]
        kept = top_percent_by(universe, "Perf.1M", 2.0)
        assert [r["ticker"] for r in kept] == ["T99", "T98"]

    def test_always_keeps_at_least_one(self):
        universe = [row("A", **{"Perf.1M": 5.0}), row("B", **{"Perf.1M": 1.0})]
        assert len(top_percent_by(universe, "Perf.1M", 0.001)) == 1

    def test_skips_rows_missing_the_column(self):
        universe = [row("A", **{"Perf.1M": 5.0}), row("B"), row("C", **{"Perf.1M": None})]
        kept = top_percent_by(universe, "Perf.1M", 100.0)
        assert [r["ticker"] for r in kept] == ["A"]

    def test_empty_universe_returns_empty(self):
        assert top_percent_by([], "Perf.1M", 2.0) == []

    def test_booleans_are_not_treated_as_performance(self):
        universe = [row("A", **{"Perf.1M": 1.0}), row("B", **{"Perf.1M": True})]
        kept = top_percent_by(universe, "Perf.1M", 100.0)
        assert "B" not in [r["ticker"] for r in kept] or len(kept) == 2


class TestSelectMomentumLeaders:
    def test_merges_horizons_and_deduplicates(self):
        universe = [
            row("LEADS_ALL", **{"Perf.1M": 99.0, "Perf.3M": 99.0, "Perf.6M": 99.0}),
            row("ONE_MONTH", **{"Perf.1M": 98.0, "Perf.3M": 1.0, "Perf.6M": 1.0}),
            row("SIX_MONTH", **{"Perf.1M": 1.0, "Perf.3M": 1.0, "Perf.6M": 98.0}),
            row("LAGGARD", **{"Perf.1M": 0.0, "Perf.3M": 0.0, "Perf.6M": 0.0}),
        ]
        working, per_horizon = select_momentum_leaders(universe, top_percent=50.0)
        assert working.count("LEADS_ALL") == 1
        assert len(working) == len(set(working))
        assert "LAGGARD" not in working
        assert set(per_horizon) == {"Perf.1M", "Perf.3M", "Perf.6M"}

    def test_a_single_horizon_is_enough_to_qualify(self):
        universe = [
            row("SPRINTER", **{"Perf.1M": 99.0, "Perf.3M": -50.0, "Perf.6M": -50.0}),
            row("STEADY", **{"Perf.1M": 1.0, "Perf.3M": 1.0, "Perf.6M": 1.0}),
        ]
        working, _ = select_momentum_leaders(universe, top_percent=50.0)
        assert "SPRINTER" in working

    def test_custom_horizons_are_respected(self):
        universe = [row("A", **{"Perf.1M": 9.0, "Perf.3M": 1.0})]
        _, per_horizon = select_momentum_leaders(universe, top_percent=100.0, horizons=["Perf.1M"])
        assert list(per_horizon) == ["Perf.1M"]

    def test_empty_universe_yields_empty_working_list(self):
        working, per_horizon = select_momentum_leaders([], top_percent=2.0)
        assert working == []
        assert all(v == [] for v in per_horizon.values())
