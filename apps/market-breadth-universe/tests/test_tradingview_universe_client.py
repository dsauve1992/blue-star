"""Unit tests for tradingview_universe_client."""

import os
import sys
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from tradingview_universe_client import COLUMNS, FILTERS, fetch_universe


def _mock_response(symbols: list[str]) -> MagicMock:
    response = MagicMock()
    response.json.return_value = {"data": [{"d": [symbol]} for symbol in symbols]}
    response.raise_for_status.return_value = None
    return response


@patch("tradingview_universe_client.requests.post")
def test_fetch_universe_returns_symbols(mock_post: MagicMock) -> None:
    mock_post.return_value = _mock_response(["AAPL", "MSFT", "NVDA"])

    symbols = fetch_universe()

    assert symbols == ["AAPL", "MSFT", "NVDA"]


@patch("tradingview_universe_client.requests.post")
def test_fetch_universe_skips_malformed_rows(mock_post: MagicMock) -> None:
    response = MagicMock()
    response.json.return_value = {"data": [{"d": ["AAPL"]}, {"d": []}, {"d": ["MSFT", "extra"]}]}
    response.raise_for_status.return_value = None
    mock_post.return_value = response

    symbols = fetch_universe()

    assert symbols == ["AAPL"]


@patch("tradingview_universe_client.requests.post")
def test_fetch_universe_sends_expected_payload(mock_post: MagicMock) -> None:
    mock_post.return_value = _mock_response([])

    fetch_universe(page_size=1234)

    _, kwargs = mock_post.call_args
    payload = kwargs["json"]
    assert payload["filter"] == [
        {"left": "close", "operation": "greater", "right": 1},
        {"left": "market_cap_basic", "operation": "greater", "right": 300000000},
        {"left": "AvgValue.Traded_30d", "operation": "greater", "right": 5000000},
        {"left": "is_primary", "operation": "equal", "right": True},
        {"left": "type", "operation": "equal", "right": "stock"},
    ]
    assert payload["columns"] == ["name"]
    assert payload["range"] == [0, 1234]
    assert payload["markets"] == ["america"]
    assert payload["ignore_unknown_fields"] is False
    assert payload["symbols"] == {}


def test_filters_match_rs_rating_screener() -> None:
    """The plan mandates the same filter as the RS-rating screener — guard against drift."""
    screener_dir = os.path.join(os.path.dirname(__file__), "..", "..", "screener")
    sys.path.insert(0, screener_dir)
    from rs_rating_service import UNIVERSE_FILTERS

    assert UNIVERSE_FILTERS == FILTERS
