"""
Stage 2 — LLM theme clustering.

Builds the clustering prompt from enriched tickers, then calls Claude through
one of two backends and turns the result into ProposedTheme/lone-wolf
dataclasses for theme_validation_service to validate:

- `api` — the Anthropic SDK with a forced tool call, so the response is
  schema-conformant JSON rather than prose to regex-parse. Needs
  ANTHROPIC_API_KEY.
- `claude-cli` (default) — shells out to `claude -p --json-schema`, which
  authenticates as the user's existing Claude Code session and needs no API
  key. See claude_cli_client.py for the subprocess and parsing details.

Both backends are handed the exact same prompt and JSON schema
(`CLUSTER_THEMES_TOOL["input_schema"]`), so there is exactly one place that
defines what "correct structured output" means.
"""

import os

import anthropic

from claude_cli_client import call_claude_cli
from enrichment_client import TickerEnrichment
from theme_validation_service import ProposedTheme

MODEL = "claude-opus-5"
MAX_TOKENS = 4096
DEFAULT_BACKEND = "claude-cli"
BACKENDS = ("claude-cli", "api")

CLUSTER_THEMES_TOOL = {
    "name": "cluster_themes",
    "description": (
        "Report the current market themes found among the given tickers, "
        "and the tickers that do not belong to any theme."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "themes": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "Concise theme name, e.g. 'AI Infrastructure Buildout'",
                        },
                        "catalyst": {
                            "type": "string",
                            "description": "One sentence explaining the shared current catalyst",
                        },
                        "tickers": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Tickers sharing this theme, minimum 3",
                        },
                    },
                    "required": ["name", "catalyst", "tickers"],
                },
            },
            "lone_wolves": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Tickers with no clear shared narrative with any other ticker",
            },
        },
        "required": ["themes", "lone_wolves"],
    },
}

SYSTEM_PROMPT = """You are analyzing a list of stocks that a momentum screener has already \
confirmed are in a technical uptrend. Your job is to identify which of them are moving \
together right now because of a shared current market narrative — not because they share a \
GICS sector or business model.

Rules:
- A theme is a shared current catalyst: a reason these specific stocks are all moving right now.
- Do not cluster by industry or business description alone. SNDK's business is "flash storage \
manufacturer"; its theme (if any) is why flash storage demand is spiking right now.
- A theme requires at least 3 tickers. Two companies sharing a narrative is a coincidence, not \
a theme.
- Do not force-fit a ticker into a theme it only loosely fits. When in doubt, call it a lone wolf.
- Every input ticker must appear exactly once, either in a theme or in lone_wolves.
- Name each theme concisely and write exactly one sentence for its catalyst.
- Some tickers will have no foundational headlines available — this is a known data gap, not a \
signal. Never invent an origin story to fill it in; base the catalyst on the business summary and \
recent headlines you do have."""


def _format_headlines(headlines, label: str, empty_note: str) -> str:
    if not headlines:
        return f"  {label}: {empty_note}"
    lines = [f"  {label}:"]
    for headline in headlines:
        lines.append(f"    - [{headline.published_at}] {headline.title}")
    return "\n".join(lines)


def format_ticker_block(enrichment: TickerEnrichment) -> str:
    name = enrichment.name or enrichment.ticker
    summary = enrichment.business_summary or "(no business summary available)"
    lines = [
        f"### {enrichment.ticker} — {name}",
        f"Sector/Industry: {enrichment.sector or 'unknown'} / {enrichment.industry or 'unknown'}",
        f"Business summary: {summary}",
        _format_headlines(
            enrichment.foundational_headlines,
            "Foundational headlines (30-90d)",
            "NO FOUNDATIONAL HEADLINES AVAILABLE for this ticker — do not invent an origin "
            "story; rely on the business summary and recent headlines instead",
        ),
        _format_headlines(
            enrichment.recent_headlines,
            "Recent headlines (7-14d)",
            "(none available)",
        ),
    ]
    return "\n".join(lines)


def build_prompt(enrichments: list[TickerEnrichment]) -> str:
    tickers_list = ", ".join(e.ticker for e in enrichments)
    blocks = "\n\n".join(format_ticker_block(e) for e in enrichments)
    return (
        f"Here are {len(enrichments)} tickers that passed a momentum screener: {tickers_list}\n\n"
        f"{blocks}\n\n"
        "Identify the current market themes connecting these tickers and call cluster_themes "
        "with your findings."
    )


def _require_api_key() -> str:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set. Export it before running theme clustering, e.g.:\n"
            "  export ANTHROPIC_API_KEY=sk-ant-..."
        )
    return api_key


def parse_response(tool_input: dict) -> tuple[list[ProposedTheme], list[str]]:
    themes = [
        ProposedTheme(
            name=theme["name"],
            catalyst=theme["catalyst"],
            tickers=list(theme["tickers"]),
        )
        for theme in tool_input.get("themes", [])
    ]
    lone_wolves = list(tool_input.get("lone_wolves", []))
    return themes, lone_wolves


def _extract_tool_input(message: anthropic.types.Message) -> dict:
    for block in message.content:
        if block.type == "tool_use" and block.name == CLUSTER_THEMES_TOOL["name"]:
            return block.input
    raise RuntimeError("Claude did not return a cluster_themes tool call")


def _cluster_themes_via_api(prompt: str) -> dict:
    api_key = _require_api_key()
    client = anthropic.Anthropic(api_key=api_key)

    message = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
        tools=[CLUSTER_THEMES_TOOL],
        tool_choice={"type": "tool", "name": CLUSTER_THEMES_TOOL["name"]},
    )
    return _extract_tool_input(message)


def _cluster_themes_via_claude_cli(prompt: str) -> dict:
    full_prompt = f"{SYSTEM_PROMPT}\n\n{prompt}"
    return call_claude_cli(
        prompt=full_prompt,
        json_schema=CLUSTER_THEMES_TOOL["input_schema"],
        model=MODEL,
    )


def cluster_themes(
    enrichments: list[TickerEnrichment],
    backend: str = DEFAULT_BACKEND,
) -> tuple[list[ProposedTheme], list[str]]:
    """
    Single LLM call: builds the prompt once, dispatches to the chosen
    backend, and parses the structured result into (themes, lone_wolves).
    """
    if backend not in BACKENDS:
        raise ValueError(f"Unknown backend '{backend}'; choose one of {BACKENDS}")

    prompt = build_prompt(enrichments)

    if backend == "api":
        tool_input = _cluster_themes_via_api(prompt)
    else:
        tool_input = _cluster_themes_via_claude_cli(prompt)

    return parse_response(tool_input)
