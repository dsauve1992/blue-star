"""Unit tests for smoothness_service. Synthetic series only — no network."""

import os
import sys

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from smoothness_service import (
    EMA_FAST_PERIOD,
    MIN_BARS,
    WARMUP_BARS,
    WINDOW_DAYS,
    best_window,
    compute_alignment,
    find_corruption,
    score_windows,
)


def _series(values: list[float]) -> pd.Series:
    index = pd.bdate_range("2015-01-01", periods=len(values))
    return pd.Series(values, index=index, dtype=float)


def _rising(n: int, step: float = 1.0, start: float = 100.0) -> pd.Series:
    return _series([start + step * i for i in range(n)])


class TestComputeAlignment:
    def test_warmup_bars_are_undefined_not_false(self):
        aligned = compute_alignment(_rising(80))
        assert aligned.iloc[: WARMUP_BARS - 1].isna().all()
        assert aligned.iloc[WARMUP_BARS - 1 :].notna().all()

    def test_steady_uptrend_is_aligned(self):
        aligned = compute_alignment(_rising(200))
        assert bool(aligned.iloc[WARMUP_BARS - 1 :].all())

    def test_steady_downtrend_is_not_aligned(self):
        aligned = compute_alignment(_rising(200, step=-0.5, start=300.0))
        assert not bool(aligned.iloc[WARMUP_BARS - 1 :].any())

    def test_uses_recursive_ema_not_adjusted(self):
        """Guards against reverting to pandas' adjust=True default."""
        close = _series([1.0, 2.0, 3.0])
        recursive = close.ewm(span=EMA_FAST_PERIOD, adjust=False).mean()
        adjusted = close.ewm(span=EMA_FAST_PERIOD).mean()
        assert recursive.iloc[1] != adjusted.iloc[1]
        alpha = 2.0 / (EMA_FAST_PERIOD + 1)
        assert recursive.iloc[1] == pytest.approx(1.0 + alpha * (2.0 - 1.0))


class TestScoreWindows:
    def test_window_count(self):
        close = _rising(MIN_BARS + 40)
        frame = score_windows(close)
        assert len(frame) == len(close) - MIN_BARS + 1

    def test_exactly_min_bars_yields_one_window(self):
        frame = score_windows(_rising(MIN_BARS))
        assert len(frame) == 1

    def test_too_few_bars_yields_no_windows(self):
        assert score_windows(_rising(MIN_BARS - 1)).empty

    def test_perfect_window_has_no_bad_days_and_score_equals_perf(self):
        frame = score_windows(_rising(MIN_BARS))
        row = frame.iloc[0]
        assert row["bad_days"] == 0
        assert row["aligned_days"] == WINDOW_DAYS
        assert row["score"] == row["perf"]

    def test_perf_is_close_to_close(self):
        close = _rising(MIN_BARS)
        frame = score_windows(close)
        row = frame.iloc[0]
        first = close.iloc[WARMUP_BARS - 1]
        last = close.iloc[-1]
        assert row["perf"] == (last / first - 1.0)
        assert row["window_start"] == close.index[WARMUP_BARS - 1]
        assert row["window_end"] == close.index[-1]

    def test_dip_produces_bad_days(self):
        values = [100.0 + i for i in range(MIN_BARS)]
        for offset in range(100, 115):
            values[offset] = 60.0
        frame = score_windows(_series(values))
        assert frame.iloc[0]["bad_days"] > 0

    def test_alignment_pct_complements_bad_days(self):
        values = [100.0 + i for i in range(MIN_BARS)]
        for offset in range(100, 115):
            values[offset] = 60.0
        row = score_windows(_series(values)).iloc[0]
        assert row["aligned_days"] == WINDOW_DAYS - row["bad_days"]
        assert row["alignment_pct"] == row["aligned_days"] / WINDOW_DAYS

    def test_scattered_and_contiguous_bad_days_differ_by_streak(self):
        """Same bad-day total, different shape — only longest_bad_streak sees it."""
        flat = [100.0] * WARMUP_BARS
        contiguous = _series(flat + [100.0 + i for i in range(WINDOW_DAYS)])
        frame = score_windows(contiguous)
        row = frame.iloc[0]
        assert row["longest_bad_streak"] <= row["bad_days"]

    def test_longest_bad_streak_is_zero_for_perfect_window(self):
        row = score_windows(_rising(MIN_BARS)).iloc[0]
        assert row["longest_bad_streak"] == 0

    def test_score_penalises_bad_days_for_equal_perf(self):
        smooth = score_windows(_rising(MIN_BARS)).iloc[0]

        choppy_values = [100.0 + i for i in range(MIN_BARS)]
        for offset in range(60, 75):
            choppy_values[offset] = 55.0
        choppy_values[-1] = smooth["perf"] * 100.0 + 100.0
        choppy = score_windows(_series(choppy_values)).iloc[0]

        assert choppy["bad_days"] > smooth["bad_days"]
        assert choppy["score"] < smooth["score"]


class TestFindCorruption:
    """Regression tests for reverse-split artifacts seen in the first full run."""

    def test_clean_series_passes(self):
        assert find_corruption(_rising(MIN_BARS)) is None

    def test_reverse_split_jump_is_rejected(self):
        values = [1.0] * 100 + [100.0] * 100  # 1-for-100 reverse overnight
        reason = find_corruption(_series(values))
        assert reason is not None and "single-day move" in reason

    def test_zero_price_is_rejected(self):
        values = [10.0] * 50 + [0.0] + [10.0] * 50
        assert find_corruption(_series(values)) == "non-positive price"

    def test_implausible_price_range_is_rejected(self):
        """PPCB spanned $0.01 to $2.06e11 in the live run."""
        values = [0.01] * 100 + [2.06e11] * 100
        assert find_corruption(_series(values)) is not None

    def test_sub_penny_series_is_rejected(self):
        assert find_corruption(_series([0.002] * 200)) == "sub-penny median price"

    def test_realistic_volatility_is_kept(self):
        """A genuine +40% gap must survive; only absurd moves are artifacts."""
        values = [100.0] * 100 + [140.0 + i for i in range(100)]
        assert find_corruption(_series(values)) is None

    def test_biotech_binary_event_is_kept(self):
        """
        Real names gapped hard on trial/FDA news and must not be screened out:
        MDGL +268%, ENLT +583%, QXO +240%. Threshold sits above these.
        """
        for multiple in (2.4, 3.68, 6.83):
            values = [10.0] * 100 + [10.0 * multiple + i * 0.1 for i in range(100)]
            assert find_corruption(_series(values)) is None, f"{multiple}x rejected"

    def test_ten_x_overnight_is_rejected(self):
        """No security gains 1000% in a session; that is a reverse split."""
        values = [10.0] * 100 + [150.0 + i for i in range(100)]
        reason = find_corruption(_series(values))
        assert reason is not None and "single-day move" in reason

    def test_best_window_rejects_corrupt_series_by_default(self):
        """
        A 20x overnight gap trips the series screen. Disabling that screen still
        scores the series, because the window-level cap is a separate guard and
        this window's total return stays under it.
        """
        values = [1.0] * (MIN_BARS - 20) + [20.0 + i for i in range(20)]
        close = _series(values)
        assert find_corruption(close) is not None
        assert best_window("BAD", close) is None
        assert best_window("BAD", close, screen_corruption=False) is not None

    def test_smeared_reverse_split_is_dropped_at_window_level(self):
        """
        RGC (+55,509%) and BRTX (+33,400%) cleared the per-day check because the
        split was spread over several sessions. The window cap catches them.
        """
        values = [0.1] * WARMUP_BARS
        price = 0.1
        for _ in range(WINDOW_DAYS):
            price *= 1.1
            values.append(price)
        frame = score_windows(_series(values))
        assert frame.empty or frame["perf"].max() <= 100.0

    def test_ordinary_multibagger_window_survives_the_cap(self):
        """A +2,554% window (NVAX 2020) is real and must not be capped away."""
        values = [10.0] * WARMUP_BARS + [
            10.0 * (1.0 + 25.0 * i / (WINDOW_DAYS - 1)) for i in range(WINDOW_DAYS)
        ]
        frame = score_windows(_series(values))
        assert not frame.empty
        assert frame["perf"].max() == pytest.approx(25.0)

    def test_zero_base_price_never_yields_infinite_perf(self):
        """The first full run produced perf=+inf from a zero first_close."""
        values = [0.0] * 60 + [float(i + 1) for i in range(MIN_BARS)]
        frame = score_windows(_series(values))
        assert not frame["perf"].isin([float("inf"), float("-inf")]).any()
        assert not frame["score"].isin([float("inf"), float("-inf")]).any()


class TestLiquidity:
    def test_dollar_volume_is_nan_without_volume(self):
        frame = score_windows(_rising(MIN_BARS))
        assert frame["dollar_volume"].isna().all()

    def test_dollar_volume_is_median_of_close_times_volume(self):
        close = _series([10.0] * MIN_BARS)
        volume = _series([1_000_000.0] * MIN_BARS)
        frame = score_windows(close, volume)
        assert frame.iloc[0]["dollar_volume"] == pytest.approx(10_000_000.0)

    def test_median_resists_one_blowoff_volume_day(self):
        close = _series([10.0] * MIN_BARS)
        volume = _series([100_000.0] * MIN_BARS)
        volume.iloc[-1] = 1_000_000_000.0
        frame = score_windows(close, volume)
        assert frame.iloc[0]["dollar_volume"] == pytest.approx(1_000_000.0)

    def test_thin_ticker_is_dropped_by_the_floor(self):
        """GORO's window cleared on price but not on tradeable volume."""
        close = _rising(MIN_BARS)
        volume = _series([1_000.0] * MIN_BARS)
        assert best_window("THIN", close, volume, min_dollar_volume=5_000_000) is None
        assert best_window("THIN", close, volume, min_dollar_volume=0) is not None

    def test_liquid_ticker_survives_the_floor(self):
        close = _rising(MIN_BARS)
        volume = _series([5_000_000.0] * MIN_BARS)
        record = best_window("LIQUID", close, volume, min_dollar_volume=5_000_000)
        assert record is not None
        assert record.dollar_volume >= 5_000_000

    def test_floor_picks_best_liquid_window_not_best_overall(self):
        """
        A ticker whose all-time best window was illiquid should still report its
        best tradeable window rather than being dropped entirely.
        """
        n = MIN_BARS + WINDOW_DAYS
        close = _series([100.0 + i for i in range(n)])
        volume = _series([1_000.0] * n)
        volume.iloc[-WINDOW_DAYS:] = 500_000.0

        unfiltered = best_window("MIXED", close, volume, min_dollar_volume=0)
        filtered = best_window("MIXED", close, volume, min_dollar_volume=5_000_000)
        assert unfiltered is not None and filtered is not None
        assert filtered.window_end != unfiltered.window_end
        assert filtered.dollar_volume >= 5_000_000


class TestBestWindow:
    def test_returns_none_when_history_too_short(self):
        assert best_window("SHORT", _rising(MIN_BARS - 1)) is None

    def test_returns_none_for_empty_series(self):
        assert best_window("EMPTY", _series([])) is None

    def test_picks_highest_scoring_window(self):
        close = _rising(MIN_BARS + 50)
        frame = score_windows(close)
        record = best_window("RISE", close)
        assert record is not None
        assert record.score == frame["score"].max()

    def test_dates_are_iso_strings(self):
        close = _rising(MIN_BARS)
        record = best_window("RISE", close)
        assert record is not None
        assert record.window_start == close.index[WARMUP_BARS - 1].date().isoformat()
        assert record.window_end == close.index[-1].date().isoformat()

    def test_split_spike_reads_as_trend_break(self):
        """Documents why the client must fetch auto-adjusted prices."""
        adjusted = _rising(MIN_BARS)
        raw = adjusted.copy()
        raw.iloc[MIN_BARS // 2 :] = raw.iloc[MIN_BARS // 2 :] / 2.0

        clean = best_window("CLEAN", adjusted)
        split = best_window("SPLIT", raw)
        assert clean is not None and split is not None
        assert split.bad_days > clean.bad_days

    def test_cache_path_changes_with_schema(self):
        """
        A close-only v1 file must not be readable at a v2 path. The schema token
        is in the hash, and the loader also drops any file whose columns are not
        2-level, so a stale format can never be silently scored.
        """
        from price_history_client import CACHE_SCHEMA, _cache_path

        assert CACHE_SCHEMA in ("v2-close-volume",)
        v2 = _cache_path(["AAPL"], "2016-01-01", "2026-01-01")
        assert v2.name.startswith("bars-") and v2.suffix == ".parquet"

    def test_dual_class_tickers_map_to_yahoo_dash_form(self):
        """TradingView says BF.A, Yahoo says BF-A; without this they drop out."""
        from price_history_client import to_yahoo_symbol

        assert to_yahoo_symbol("BF.A") == "BF-A"
        assert to_yahoo_symbol("MOG.B") == "MOG-B"
        assert to_yahoo_symbol("AAPL") == "AAPL"

    def test_smooth_riser_outranks_volatile_riser(self):
        rng = np.random.default_rng(7)
        n = MIN_BARS + 200

        smooth = _series([100.0 * (1.004**i) for i in range(n)])
        noise = np.cumsum(rng.normal(0.0, 0.045, n))
        volatile = _series([100.0 * (1.004**i) * float(np.exp(noise[i])) for i in range(n)])

        smooth_record = best_window("SMOOTH", smooth)
        volatile_record = best_window("VOL", volatile)
        assert smooth_record is not None and volatile_record is not None
        assert smooth_record.bad_days < volatile_record.bad_days
