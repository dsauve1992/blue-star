import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

import constituent_ranking_service as ranking
from constituent_ranking_service import (
    IDIOSYNCRATIC,
    MIXED,
    SHARED_DRIVER,
    UNKNOWN,
    RankedConstituent,
    build_prompt,
    classify_coherence,
    parse_response,
    rank_theme,
)
from enrichment_client import Headline, TickerEnrichment
from theme_validation_service import ValidatedTheme


def make_theme(tickers, average_correlation=None, name="Test Theme"):
    return ValidatedTheme(
        name=name,
        catalyst="A shared catalyst.",
        tickers=list(tickers),
        breadth=len(tickers),
        average_correlation=average_correlation,
        score=float(len(tickers)),
    )


def make_enrichments(tickers):
    return {
        ticker: TickerEnrichment(
            ticker=ticker,
            name=f"{ticker} Inc.",
            sector="Technology",
            industry="Semiconductors",
            business_summary=f"{ticker} makes things.",
            recent_headlines=[Headline(title=f"{ticker} news", published_at="2026-08-01T00:00:00Z")],
            foundational_headlines=[],
        )
        for ticker in tickers
    }


class TestClassifyCoherence:
    def test_high_correlation_is_shared_driver(self):
        assert classify_coherence(0.764) == SHARED_DRIVER

    def test_threshold_boundary_is_shared_driver(self):
        assert classify_coherence(0.55) == SHARED_DRIVER

    def test_mid_correlation_is_mixed(self):
        assert classify_coherence(0.387) == MIXED

    def test_negative_correlation_is_idiosyncratic(self):
        assert classify_coherence(-0.025) == IDIOSYNCRATIC

    def test_low_positive_correlation_is_idiosyncratic(self):
        assert classify_coherence(0.20) == IDIOSYNCRATIC

    def test_missing_correlation_is_unknown(self):
        assert classify_coherence(None) == UNKNOWN


class TestLeverage:
    def test_leverage_is_mean_of_three_axes(self):
        member = RankedConstituent("AAOI", exposure=9, catalyst=8, room=4, thesis="", next_catalyst="")
        assert member.leverage == pytest.approx(7.0)

    def test_all_tens_is_ten(self):
        member = RankedConstituent("X", exposure=10, catalyst=10, room=10, thesis="", next_catalyst="")
        assert member.leverage == pytest.approx(10.0)


class TestParseResponse:
    def test_orders_by_leverage_descending(self):
        payload = {
            "theme_context": "ctx",
            "theme_durability": "mid",
            "constituents": [
                {"ticker": "LOW", "exposure": 2, "catalyst": 2, "room": 2, "thesis": "t", "next_catalyst": "n"},
                {"ticker": "HIGH", "exposure": 9, "catalyst": 9, "room": 9, "thesis": "t", "next_catalyst": "n"},
                {"ticker": "MID", "exposure": 5, "catalyst": 5, "room": 5, "thesis": "t", "next_catalyst": "n"},
            ],
        }
        _, _, constituents = parse_response(payload)
        assert [c.ticker for c in constituents] == ["HIGH", "MID", "LOW"]

    def test_ties_broken_by_exposure(self):
        payload = {
            "constituents": [
                {"ticker": "SPREAD", "exposure": 3, "catalyst": 9, "room": 6, "thesis": "t", "next_catalyst": "n"},
                {"ticker": "PURE", "exposure": 9, "catalyst": 6, "room": 3, "thesis": "t", "next_catalyst": "n"},
            ],
        }
        _, _, constituents = parse_response(payload)
        assert constituents[0].leverage == constituents[1].leverage
        assert constituents[0].ticker == "PURE"

    def test_uppercases_tickers(self):
        payload = {"constituents": [{"ticker": "aaoi", "exposure": 5, "catalyst": 5, "room": 5, "thesis": "t", "next_catalyst": "n"}]}
        _, _, constituents = parse_response(payload)
        assert constituents[0].ticker == "AAOI"

    def test_returns_context_and_durability(self):
        payload = {"theme_context": "the context", "theme_durability": "early", "constituents": []}
        context, durability, constituents = parse_response(payload)
        assert context == "the context"
        assert durability == "early"
        assert constituents == []

    def test_missing_optional_fields_default_empty(self):
        context, durability, constituents = parse_response({})
        assert context == ""
        assert durability == ""
        assert constituents == []


class TestBuildPrompt:
    def test_shared_driver_prompt_says_ranking_is_competitive(self):
        theme = make_theme(["A", "B", "C"], average_correlation=0.76)
        prompt = build_prompt(theme, make_enrichments(["A", "B", "C"]), SHARED_DRIVER)
        assert "move together" in prompt
        assert "+0.76" in prompt

    def test_idiosyncratic_prompt_forbids_manufacturing_a_horse_race(self):
        theme = make_theme(["A", "B", "C"], average_correlation=-0.03)
        prompt = build_prompt(theme, make_enrichments(["A", "B", "C"]), IDIOSYNCRATIC)
        assert "do NOT move together" in prompt
        assert "not manufacture a horse race" in prompt.replace("Do ", "").replace("do ", "")

    def test_unknown_coherence_prompt_has_no_correlation_number(self):
        theme = make_theme(["A", "B", "C"], average_correlation=None)
        prompt = build_prompt(theme, make_enrichments(["A", "B", "C"]), UNKNOWN)
        assert "could not be measured" in prompt

    def test_includes_every_constituent_block(self):
        theme = make_theme(["AAA", "BBB", "CCC"], average_correlation=0.7)
        prompt = build_prompt(theme, make_enrichments(["AAA", "BBB", "CCC"]), SHARED_DRIVER)
        for ticker in ("AAA", "BBB", "CCC"):
            assert f"### {ticker}" in prompt

    def test_tolerates_missing_enrichment_for_a_ticker(self):
        theme = make_theme(["AAA", "BBB"], average_correlation=0.7)
        prompt = build_prompt(theme, make_enrichments(["AAA"]), SHARED_DRIVER)
        assert "### AAA" in prompt
        assert "### BBB" not in prompt
        assert "BBB" in prompt


class TestRankTheme:
    def test_requests_web_search_and_uses_measured_coherence(self, monkeypatch):
        captured = {}

        def fake_call(prompt, json_schema, model, timeout_seconds, allowed_tools):
            captured["prompt"] = prompt
            captured["allowed_tools"] = allowed_tools
            return {
                "theme_context": "ctx",
                "theme_durability": "early",
                "constituents": [
                    {"ticker": "A", "exposure": 8, "catalyst": 7, "room": 6, "thesis": "t", "next_catalyst": "n"},
                ],
            }

        monkeypatch.setattr(ranking, "call_claude_cli", fake_call)

        theme = make_theme(["A", "B", "C"], average_correlation=0.72)
        ranked = rank_theme(theme, make_enrichments(["A", "B", "C"]))

        assert captured["allowed_tools"] == "WebSearch"
        assert ranked.coherence == SHARED_DRIVER
        assert ranked.average_correlation == pytest.approx(0.72)
        assert ranked.theme_durability == "early"
        assert [c.ticker for c in ranked.constituents] == ["A"]

    def test_preserves_theme_identity(self, monkeypatch):
        monkeypatch.setattr(
            ranking,
            "call_claude_cli",
            lambda **kwargs: {"theme_context": "c", "theme_durability": "mid", "constituents": []},
        )
        theme = make_theme(["A", "B", "C"], average_correlation=0.1, name="Announced Takeout Bids")
        ranked = rank_theme(theme, make_enrichments(["A", "B", "C"]))
        assert ranked.name == "Announced Takeout Bids"
        assert ranked.catalyst == "A shared catalyst."
        assert ranked.coherence == IDIOSYNCRATIC
