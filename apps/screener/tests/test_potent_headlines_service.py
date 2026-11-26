import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import potent_headlines_service
from potent_headlines_service import fetch_headlines, map_item, to_yahoo_symbol


def news_item(title="Acme beats", url="https://example.com/a"):
    return {
        "id": "1",
        "content": {
            "title": title,
            "pubDate": "2026-11-25T21:05:00Z",
            "provider": {"displayName": "Reuters"},
            "canonicalUrl": {"url": url},
            "clickThroughUrl": None,
        },
    }


class FakeTicker:
    def __init__(self, items=None, raises=None, logs_error=False):
        self.items = items or []
        self.raises = raises
        self.logs_error = logs_error

    def get_news(self, count):
        if self.raises:
            raise self.raises
        if self.logs_error:
            logging.getLogger("yfinance").error("ACME: Failed to retrieve the news")
        return self.items


def use_ticker(monkeypatch, fake):
    requested = []

    def factory(symbol):
        requested.append(symbol)
        return fake

    monkeypatch.setattr(potent_headlines_service.yf, "Ticker", factory)
    return requested


class TestMapItem:
    def test_maps_the_nested_content_shape(self):
        assert map_item(news_item()) == {
            "title": "Acme beats",
            "publisher": "Reuters",
            "url": "https://example.com/a",
            "published_at": "2026-11-25T21:05:00Z",
        }

    def test_falls_back_to_click_through_url(self):
        item = news_item()
        item["content"]["canonicalUrl"] = None
        item["content"]["clickThroughUrl"] = {"url": "https://example.com/b"}
        assert map_item(item)["url"] == "https://example.com/b"

    def test_drops_an_item_without_url(self):
        item = news_item()
        item["content"]["canonicalUrl"] = None
        assert map_item(item) is None


class TestFetchHeadlines:
    def test_caps_at_ten_headlines(self, monkeypatch):
        use_ticker(monkeypatch, FakeTicker(items=[news_item(url=f"https://e.com/{i}") for i in range(12)]))
        result = fetch_headlines("ACME")
        assert len(result["items"]) == 10
        assert result["error"] is None

    def test_reports_an_exception_as_an_error_not_as_no_news(self, monkeypatch):
        use_ticker(monkeypatch, FakeTicker(raises=RuntimeError("Yahoo down")))
        assert fetch_headlines("ACME") == {"items": [], "error": "Yahoo down"}

    def test_reports_a_logged_yfinance_failure_as_an_error(self, monkeypatch):
        use_ticker(monkeypatch, FakeTicker(items=[news_item()], logs_error=True))
        assert fetch_headlines("ACME") == {"items": [], "error": "ACME: Failed to retrieve the news"}

    def test_reports_an_unrecognised_item_shape_as_an_error(self, monkeypatch):
        use_ticker(monkeypatch, FakeTicker(items=[{"id": "1", "headline": "Acme beats"}]))
        assert fetch_headlines("ACME") == {
            "items": [],
            "error": "1 news items returned but none had a title and URL",
        }

    def test_returns_no_error_for_a_ticker_without_news(self, monkeypatch):
        use_ticker(monkeypatch, FakeTicker(items=[]))
        assert fetch_headlines("ACME") == {"items": [], "error": None}

    def test_requests_the_yahoo_form_of_a_class_share_symbol(self, monkeypatch):
        requested = use_ticker(monkeypatch, FakeTicker())
        fetch_headlines("BRK.B")
        assert requested == ["BRK-B"]


def test_to_yahoo_symbol_keeps_plain_symbols():
    assert to_yahoo_symbol("NVDA") == "NVDA"
