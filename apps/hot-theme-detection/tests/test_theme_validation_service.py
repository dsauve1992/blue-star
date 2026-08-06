"""Unit tests for theme_validation_service. Synthetic data only — no network."""

import os
import sys

import pandas as pd
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from theme_validation_service import (
    DEFAULT_CORRELATION_THRESHOLD,
    MIN_BREADTH,
    ProposedTheme,
    average_pairwise_correlation,
    score_theme,
    validate_themes,
)


def _closes(values: list[float]) -> pd.Series:
    index = pd.bdate_range("2026-01-01", periods=len(values))
    return pd.Series(values, index=index, dtype=float)


def _moving_together(n: int = 15) -> dict[str, pd.Series]:
    base = [100.0 * (1.01**i) for i in range(n)]
    return {
        "AAA": _closes(base),
        "BBB": _closes([v * 2.0 for v in base]),
        "CCC": _closes([v * 0.5 for v in base]),
    }


def _uncorrelated(n: int = 15) -> dict[str, pd.Series]:
    import math

    return {
        "AAA": _closes([100.0 * (1.01**i) for i in range(n)]),
        "BBB": _closes([100.0 * (1.0 + 0.05 * math.sin(i)) for i in range(n)]),
        "CCC": _closes([100.0 * (1.0 - 0.005 * i) for i in range(n)]),
    }


class TestAveragePairwiseCorrelation:
    def test_perfectly_moving_together_is_near_one(self):
        corr = average_pairwise_correlation(["AAA", "BBB", "CCC"], _moving_together())
        assert corr is not None
        assert corr > 0.99

    def test_returns_none_with_fewer_than_two_series(self):
        history = {"AAA": _closes([100.0] * 15)}
        assert average_pairwise_correlation(["AAA"], history) is None

    def test_returns_none_when_no_price_data_at_all(self):
        assert average_pairwise_correlation(["AAA", "BBB"], {}) is None

    def test_ticker_with_missing_history_is_excluded_not_fatal(self):
        history = _moving_together()
        del history["CCC"]
        corr = average_pairwise_correlation(["AAA", "BBB", "CCC"], history)
        assert corr is not None
        assert corr > 0.99

    def test_ticker_with_too_short_history_is_excluded(self):
        history = _moving_together()
        history["CCC"] = _closes([100.0, 101.0])
        corr = average_pairwise_correlation(["AAA", "BBB", "CCC"], history, window_days=10)
        assert corr is not None

    def test_window_days_controls_lookback_length(self):
        history = _moving_together(n=20)
        short = average_pairwise_correlation(["AAA", "BBB"], history, window_days=5)
        long = average_pairwise_correlation(["AAA", "BBB"], history, window_days=15)
        assert short is not None and long is not None


class TestScoreTheme:
    def test_v1_score_is_breadth_only(self):
        assert score_theme(breadth=5, average_correlation=0.9, use_correlation=False) == 5.0

    def test_v1_score_ignores_none_correlation(self):
        assert score_theme(breadth=4, average_correlation=None, use_correlation=False) == 4.0

    def test_v2_score_exceeds_breadth_with_positive_correlation(self):
        score = score_theme(breadth=5, average_correlation=0.8, use_correlation=True)
        assert score > 5.0

    def test_v2_score_falls_back_to_breadth_when_correlation_missing(self):
        assert score_theme(breadth=5, average_correlation=None, use_correlation=True) == 5.0

    def test_v2_higher_correlation_yields_higher_score_for_equal_breadth(self):
        low = score_theme(breadth=5, average_correlation=0.4, use_correlation=True)
        high = score_theme(breadth=5, average_correlation=0.9, use_correlation=True)
        assert high > low


class TestValidateThemesBreadth:
    def test_theme_of_exactly_three_survives(self):
        theme = ProposedTheme(name="T", catalyst="c", tickers=["AAA", "BBB", "CCC"])
        result = validate_themes([theme], [])
        assert len(result.themes) == 1
        assert result.themes[0].breadth == 3

    def test_theme_of_two_dissolves_into_lone_wolves(self):
        theme = ProposedTheme(name="T", catalyst="c", tickers=["AAA", "BBB"])
        result = validate_themes([theme], [])
        assert result.themes == []
        assert set(result.lone_wolves) == {"AAA", "BBB"}
        assert result.dissolved == ["T"]

    def test_single_ticker_theme_dissolves(self):
        theme = ProposedTheme(name="T", catalyst="c", tickers=["AAA"])
        result = validate_themes([theme], [])
        assert result.themes == []
        assert result.lone_wolves == ["AAA"]

    def test_empty_input_yields_empty_result(self):
        result = validate_themes([], [])
        assert result.themes == []
        assert result.lone_wolves == []
        assert result.dissolved == []

    def test_existing_lone_wolves_are_preserved(self):
        theme = ProposedTheme(name="T", catalyst="c", tickers=["AAA", "BBB", "CCC"])
        result = validate_themes([theme], ["ZZZ"])
        assert "ZZZ" in result.lone_wolves

    def test_dissolved_tickers_join_existing_lone_wolves(self):
        theme = ProposedTheme(name="T", catalyst="c", tickers=["AAA"])
        result = validate_themes([theme], ["ZZZ"])
        assert set(result.lone_wolves) == {"AAA", "ZZZ"}

    def test_lone_wolves_are_deduplicated_and_sorted(self):
        theme = ProposedTheme(name="T", catalyst="c", tickers=["BBB"])
        result = validate_themes([theme], ["BBB", "AAA"])
        assert result.lone_wolves == ["AAA", "BBB"]

    def test_custom_min_breadth_raises_the_bar(self):
        theme = ProposedTheme(name="T", catalyst="c", tickers=["AAA", "BBB", "CCC"])
        result = validate_themes([theme], [], min_breadth=4)
        assert result.themes == []
        assert set(result.lone_wolves) == {"AAA", "BBB", "CCC"}

    def test_default_min_breadth_is_three(self):
        assert MIN_BREADTH == 3

    def test_multiple_themes_ranked_by_score_descending(self):
        small = ProposedTheme(name="Small", catalyst="c", tickers=["AAA", "BBB", "CCC"])
        big = ProposedTheme(
            name="Big", catalyst="c", tickers=["DDD", "EEE", "FFF", "GGG", "HHH"]
        )
        result = validate_themes([small, big], [])
        assert [t.name for t in result.themes] == ["Big", "Small"]

    def test_themes_and_lone_wolves_partition_all_input_tickers(self):
        theme = ProposedTheme(name="T", catalyst="c", tickers=["AAA", "BBB", "CCC"])
        result = validate_themes([theme], ["ZZZ"])
        all_out = set(result.lone_wolves) | {t for theme in result.themes for t in theme.tickers}
        assert all_out == {"AAA", "BBB", "CCC", "ZZZ"}


class TestValidateThemesCorrelation:
    def test_correlated_theme_survives_with_correlation_enabled(self):
        theme = ProposedTheme(name="T", catalyst="c", tickers=["AAA", "BBB", "CCC"])
        result = validate_themes(
            [theme], [], price_history=_moving_together(), use_correlation=True
        )
        assert len(result.themes) == 1
        assert result.themes[0].average_correlation > DEFAULT_CORRELATION_THRESHOLD

    def test_uncorrelated_theme_dissolves_with_correlation_enabled(self):
        theme = ProposedTheme(name="T", catalyst="c", tickers=["AAA", "BBB", "CCC"])
        result = validate_themes(
            [theme], [], price_history=_uncorrelated(), use_correlation=True
        )
        assert result.themes == []
        assert set(result.lone_wolves) == {"AAA", "BBB", "CCC"}

    def test_missing_price_data_dissolves_theme_when_correlation_enabled(self):
        theme = ProposedTheme(name="T", catalyst="c", tickers=["AAA", "BBB", "CCC"])
        result = validate_themes([theme], [], price_history={}, use_correlation=True)
        assert result.themes == []
        assert set(result.lone_wolves) == {"AAA", "BBB", "CCC"}

    def test_correlation_disabled_ignores_price_history_entirely(self):
        theme = ProposedTheme(name="T", catalyst="c", tickers=["AAA", "BBB", "CCC"])
        result = validate_themes([theme], [], price_history={}, use_correlation=False)
        assert len(result.themes) == 1
        assert result.themes[0].average_correlation is None

    def test_custom_threshold_can_admit_a_weaker_theme(self):
        theme = ProposedTheme(name="T", catalyst="c", tickers=["AAA", "BBB", "CCC"])
        result = validate_themes(
            [theme],
            [],
            price_history=_uncorrelated(),
            use_correlation=True,
            correlation_threshold=-1.0,
        )
        assert len(result.themes) == 1

    def test_breadth_gate_runs_before_correlation_gate(self):
        theme = ProposedTheme(name="T", catalyst="c", tickers=["AAA", "BBB"])
        result = validate_themes(
            [theme], [], price_history=_moving_together(), use_correlation=True
        )
        assert result.themes == []
        assert result.dissolved == ["T"]


class TestMeasureCorrelationWithoutGating:
    def _themes(self):
        return [ProposedTheme(name="T", catalyst="c", tickers=["A", "B", "C"])]

    def _anticorrelated_history(self):
        import numpy as np
        rising = pd.Series([100 + i for i in range(20)])
        falling = pd.Series([100 - i for i in range(20)])
        choppy = pd.Series([100 + (3 if i % 2 else -3) for i in range(20)])
        return {"A": rising, "B": falling, "C": choppy}

    def test_measure_records_correlation_and_keeps_theme(self):
        result = validate_themes(
            self._themes(), [], price_history=self._anticorrelated_history(),
            measure_correlation=True,
        )
        assert len(result.themes) == 1
        assert result.themes[0].average_correlation is not None
        assert result.dissolved == []

    def test_strict_gate_dissolves_what_measure_keeps(self):
        history = self._anticorrelated_history()
        measured = validate_themes(self._themes(), [], price_history=history, measure_correlation=True)
        gated = validate_themes(self._themes(), [], price_history=history, use_correlation=True)
        assert len(measured.themes) == 1
        assert len(gated.themes) == 0
        assert gated.dissolved == ["T"]

    def test_measure_leaves_score_as_breadth(self):
        result = validate_themes(
            self._themes(), [], price_history=self._anticorrelated_history(),
            measure_correlation=True,
        )
        assert result.themes[0].score == 3.0

    def test_measure_without_price_data_reports_none(self):
        result = validate_themes(self._themes(), [], price_history={}, measure_correlation=True)
        assert len(result.themes) == 1
        assert result.themes[0].average_correlation is None

    def test_breadth_gate_still_applies_under_measure(self):
        thin = [ProposedTheme(name="Thin", catalyst="c", tickers=["A", "B"])]
        result = validate_themes(thin, [], price_history=self._anticorrelated_history(), measure_correlation=True)
        assert result.themes == []
        assert result.dissolved == ["Thin"]
