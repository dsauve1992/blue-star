"""
Unit tests for theme_clustering_service. No real API calls — the Anthropic
client is stubbed so prompt-building and response-parsing are tested in
isolation.
"""

import os
import sys
from types import SimpleNamespace

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from enrichment_client import Headline, TickerEnrichment
from theme_clustering_service import (
    CLUSTER_THEMES_TOOL,
    _extract_tool_input,
    build_prompt,
    cluster_themes,
    format_ticker_block,
    parse_response,
)
from theme_validation_service import ProposedTheme


def _enrichment(ticker: str, with_news: bool = True) -> TickerEnrichment:
    recent = (
        [Headline(title=f"{ticker} recent news", published_at="2026-08-01T00:00:00Z")]
        if with_news
        else []
    )
    foundational = (
        [Headline(title=f"{ticker} foundational news", published_at="2026-06-01T00:00:00Z")]
        if with_news
        else []
    )
    return TickerEnrichment(
        ticker=ticker,
        name=f"{ticker} Corp",
        sector="Technology",
        industry="Semiconductors",
        business_summary=f"{ticker} makes things.",
        recent_headlines=recent,
        foundational_headlines=foundational,
    )


class TestFormatTickerBlock:
    def test_includes_core_fields(self):
        block = format_ticker_block(_enrichment("NVDA"))
        assert "NVDA" in block
        assert "NVDA Corp" in block
        assert "Technology" in block
        assert "makes things" in block

    def test_handles_missing_recent_news_gracefully(self):
        block = format_ticker_block(_enrichment("THIN", with_news=False))
        assert "none available" in block

    def test_missing_foundational_headlines_are_labeled_explicitly_not_omitted(self):
        block = format_ticker_block(_enrichment("THIN", with_news=False))
        assert "NO FOUNDATIONAL HEADLINES AVAILABLE" in block
        assert "do not invent an origin story" in block

    def test_present_foundational_headlines_do_not_show_the_absence_note(self):
        block = format_ticker_block(_enrichment("NVDA", with_news=True))
        assert "NO FOUNDATIONAL HEADLINES AVAILABLE" not in block

    def test_handles_missing_business_summary(self):
        enrichment = TickerEnrichment(ticker="BARE")
        block = format_ticker_block(enrichment)
        assert "no business summary available" in block


class TestBuildPrompt:
    def test_lists_all_tickers(self):
        prompt = build_prompt([_enrichment("NVDA"), _enrichment("AVGO")])
        assert "NVDA" in prompt
        assert "AVGO" in prompt

    def test_instructs_to_call_the_tool(self):
        prompt = build_prompt([_enrichment("NVDA")])
        assert "cluster_themes" in prompt

    def test_empty_list_still_produces_a_string(self):
        prompt = build_prompt([])
        assert isinstance(prompt, str)


class TestParseResponse:
    def test_parses_themes_and_lone_wolves(self):
        tool_input = {
            "themes": [
                {"name": "AI Infra", "catalyst": "capex cycle", "tickers": ["NVDA", "AVGO", "SNDK"]}
            ],
            "lone_wolves": ["CELH"],
        }
        themes, lone_wolves = parse_response(tool_input)
        assert len(themes) == 1
        assert themes[0] == ProposedTheme(
            name="AI Infra", catalyst="capex cycle", tickers=["NVDA", "AVGO", "SNDK"]
        )
        assert lone_wolves == ["CELH"]

    def test_handles_no_themes(self):
        themes, lone_wolves = parse_response({"themes": [], "lone_wolves": ["AAA", "BBB"]})
        assert themes == []
        assert lone_wolves == ["AAA", "BBB"]

    def test_handles_missing_keys_gracefully(self):
        themes, lone_wolves = parse_response({})
        assert themes == []
        assert lone_wolves == []


class TestExtractToolInput:
    def test_finds_tool_use_block(self):
        message = SimpleNamespace(
            content=[
                SimpleNamespace(type="text", text="thinking..."),
                SimpleNamespace(
                    type="tool_use",
                    name=CLUSTER_THEMES_TOOL["name"],
                    input={"themes": [], "lone_wolves": []},
                ),
            ]
        )
        result = _extract_tool_input(message)
        assert result == {"themes": [], "lone_wolves": []}

    def test_raises_when_no_tool_use_block_present(self):
        message = SimpleNamespace(content=[SimpleNamespace(type="text", text="no tool call")])
        with pytest.raises(RuntimeError):
            _extract_tool_input(message)


class TestClusterThemes:
    def test_rejects_unknown_backend(self):
        with pytest.raises(ValueError, match="backend"):
            cluster_themes([_enrichment("NVDA")], backend="not-a-real-backend")

    def test_raises_actionable_error_without_api_key(self, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        with pytest.raises(RuntimeError, match="ANTHROPIC_API_KEY"):
            cluster_themes([_enrichment("NVDA")], backend="api")

    def test_calls_api_with_forced_tool_choice_and_parses_result(self, monkeypatch):
        monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-fake")

        captured_kwargs = {}

        fake_message = SimpleNamespace(
            content=[
                SimpleNamespace(
                    type="tool_use",
                    name=CLUSTER_THEMES_TOOL["name"],
                    input={
                        "themes": [
                            {
                                "name": "AI Infra",
                                "catalyst": "capex cycle",
                                "tickers": ["NVDA", "AVGO", "SNDK"],
                            }
                        ],
                        "lone_wolves": ["CELH"],
                    },
                )
            ]
        )

        class FakeMessages:
            def create(self, **kwargs):
                captured_kwargs.update(kwargs)
                return fake_message

        class FakeClient:
            def __init__(self, api_key=None):
                captured_kwargs["api_key"] = api_key
                self.messages = FakeMessages()

        import theme_clustering_service

        monkeypatch.setattr(theme_clustering_service.anthropic, "Anthropic", FakeClient)

        themes, lone_wolves = cluster_themes(
            [_enrichment("NVDA"), _enrichment("AVGO")], backend="api"
        )

        assert themes == [
            ProposedTheme(name="AI Infra", catalyst="capex cycle", tickers=["NVDA", "AVGO", "SNDK"])
        ]
        assert lone_wolves == ["CELH"]
        assert captured_kwargs["tool_choice"] == {
            "type": "tool",
            "name": CLUSTER_THEMES_TOOL["name"],
        }
        assert captured_kwargs["tools"] == [CLUSTER_THEMES_TOOL]
        assert captured_kwargs["model"] == "claude-opus-5"
        assert captured_kwargs["api_key"] == "sk-test-fake"


class TestClusterThemesViaClaudeCli:
    def test_defaults_to_claude_cli_backend(self, monkeypatch):
        import theme_clustering_service

        captured = {}

        def fake_call_claude_cli(prompt, json_schema, model):
            captured["prompt"] = prompt
            captured["json_schema"] = json_schema
            captured["model"] = model
            return {"themes": [], "lone_wolves": ["NVDA"]}

        monkeypatch.setattr(theme_clustering_service, "call_claude_cli", fake_call_claude_cli)

        themes, lone_wolves = cluster_themes([_enrichment("NVDA")])

        assert themes == []
        assert lone_wolves == ["NVDA"]
        assert captured["model"] == "claude-opus-5"
        assert captured["json_schema"] == CLUSTER_THEMES_TOOL["input_schema"]

    def test_prepends_system_prompt_to_the_shared_prompt(self, monkeypatch):
        import theme_clustering_service

        captured = {}

        def fake_call_claude_cli(prompt, json_schema, model):
            captured["prompt"] = prompt
            return {"themes": [], "lone_wolves": []}

        monkeypatch.setattr(theme_clustering_service, "call_claude_cli", fake_call_claude_cli)

        cluster_themes([_enrichment("NVDA")], backend="claude-cli")

        assert theme_clustering_service.SYSTEM_PROMPT in captured["prompt"]
        assert "NVDA" in captured["prompt"]

    def test_parses_result_the_same_way_as_the_api_backend(self, monkeypatch):
        import theme_clustering_service

        def fake_call_claude_cli(prompt, json_schema, model):
            return {
                "themes": [
                    {"name": "AI Infra", "catalyst": "capex cycle", "tickers": ["A", "B", "C"]}
                ],
                "lone_wolves": ["D"],
            }

        monkeypatch.setattr(theme_clustering_service, "call_claude_cli", fake_call_claude_cli)

        themes, lone_wolves = cluster_themes([_enrichment("NVDA")], backend="claude-cli")

        assert themes == [ProposedTheme(name="AI Infra", catalyst="capex cycle", tickers=["A", "B", "C"])]
        assert lone_wolves == ["D"]
