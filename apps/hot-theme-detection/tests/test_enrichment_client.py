"""Unit tests for the pure parts of enrichment_client. No network calls."""

import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from enrichment_client import Headline, split_into_windows


def _headline_days_ago(now: datetime, days: float, title: str = "headline") -> Headline:
    published = now - timedelta(days=days)
    return Headline(title=title, published_at=published.isoformat().replace("+00:00", "Z"))


class TestSplitIntoWindows:
    def test_recent_and_foundational_are_separated(self):
        now = datetime(2026, 8, 4, tzinfo=timezone.utc)
        headlines = [
            _headline_days_ago(now, 3, "recent-1"),
            _headline_days_ago(now, 45, "foundational-1"),
        ]
        recent, foundational = split_into_windows(headlines, now)
        assert [h.title for h in recent] == ["recent-1"]
        assert [h.title for h in foundational] == ["foundational-1"]

    def test_headline_older_than_foundational_max_is_dropped(self):
        now = datetime(2026, 8, 4, tzinfo=timezone.utc)
        headlines = [_headline_days_ago(now, 200, "ancient")]
        recent, foundational = split_into_windows(headlines, now)
        assert recent == []
        assert foundational == []

    def test_gap_between_windows_is_not_double_counted(self):
        now = datetime(2026, 8, 4, tzinfo=timezone.utc)
        headlines = [_headline_days_ago(now, 20, "gap-headline")]
        recent, foundational = split_into_windows(
            headlines, now, recent_max_days=14, foundational_min_days=30
        )
        assert recent == []
        assert foundational == []

    def test_windows_are_capped_at_headlines_per_window(self):
        now = datetime(2026, 8, 4, tzinfo=timezone.utc)
        headlines = [_headline_days_ago(now, 1 + i * 0.1, f"h{i}") for i in range(10)]
        recent, _ = split_into_windows(headlines, now, headlines_per_window=3)
        assert len(recent) == 3

    def test_windows_are_sorted_newest_first(self):
        now = datetime(2026, 8, 4, tzinfo=timezone.utc)
        headlines = [
            _headline_days_ago(now, 5, "older"),
            _headline_days_ago(now, 1, "newer"),
        ]
        recent, _ = split_into_windows(headlines, now)
        assert [h.title for h in recent] == ["newer", "older"]

    def test_empty_input_yields_empty_windows(self):
        now = datetime(2026, 8, 4, tzinfo=timezone.utc)
        recent, foundational = split_into_windows([], now)
        assert recent == []
        assert foundational == []

    def test_unparseable_timestamp_is_skipped(self):
        now = datetime(2026, 8, 4, tzinfo=timezone.utc)
        headlines = [Headline(title="bad", published_at="not-a-date")]
        recent, foundational = split_into_windows(headlines, now)
        assert recent == []
        assert foundational == []
