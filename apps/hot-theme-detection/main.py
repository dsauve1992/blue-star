#!/usr/bin/env python3
"""
Hot Theme Detection — CLI entry point.

Builds a momentum working list from the TradingView screener, enriches each
ticker with company fundamentals and two news windows, sends them to Claude in
a single call to propose narrative themes, validates those themes on breadth and
measures their return correlation, then ranks every surviving theme's
constituents by theme leverage — one web-search-enabled Claude call per theme.

Ranking is the whole point of the tool, so it is unconditional and the run is
inherently expensive: a 16-theme run is 16 web-search calls and takes ~45
minutes. Use --dry-run while iterating on prompts.

Every tuning parameter — screener top-percent, min breadth, correlation window
and threshold, and both news windows — is fixed at the owning module's default
constant rather than exposed as a flag. Change the constant to change behavior.

Usage:
    python main.py
    python main.py --out themes-ranked.md
    python main.py --dry-run
    python main.py --use-correlation
"""

import argparse
import sys
from datetime import date, timedelta

import requests

from constituent_ranking_service import rank_theme
from enrichment_client import (
    DEFAULT_FOUNDATIONAL_MAX_DAYS,
    DEFAULT_FOUNDATIONAL_MIN_DAYS,
    enrich_tickers,
)
from price_history_client import fetch_close_history
from screener_client import DEFAULT_TOP_PERCENT, fetch_universe, select_momentum_leaders
from theme_clustering_service import BACKENDS, DEFAULT_BACKEND, build_prompt, cluster_themes
from theme_validation_service import (
    DEFAULT_CORRELATION_THRESHOLD,
    DEFAULT_CORRELATION_WINDOW_DAYS,
    validate_themes,
)


def _run_screener(quiet: bool) -> list[str]:
    universe = fetch_universe()
    working, per_horizon = select_momentum_leaders(universe)
    if not quiet:
        print(f"Screener universe: {len(universe)} tickers", file=sys.stderr)
        for horizon, tickers in per_horizon.items():
            print(f"  top {DEFAULT_TOP_PERCENT}% {horizon}: {len(tickers)}", file=sys.stderr)
        print(f"Working list after merge: {len(working)} tickers", file=sys.stderr)
    return working


COHERENCE_LABELS = {
    "shared-driver": "one shared driver, members co-move",
    "mixed": "shared category, name-specific dispersion",
    "idiosyncratic": "narrative only, members move on own events",
    "unknown": "co-movement not measured",
}


def format_ranked_output(ranked_themes, lone_wolves: list[str]) -> str:
    lines = []
    for theme in ranked_themes:
        lines.append(f"Theme: {theme.name}  [{theme.theme_durability}]")
        corr = (
            f"{theme.average_correlation:+.2f}"
            if theme.average_correlation is not None
            else "n/a"
        )
        lines.append(f"Coherence: {COHERENCE_LABELS[theme.coherence]} (corr {corr})")
        lines.append(f"Context: {theme.theme_context}")
        lines.append("")
        for rank, member in enumerate(theme.constituents, start=1):
            lines.append(
                f"  {rank}. {member.ticker:<6} leverage {member.leverage:4.1f}  "
                f"exposure {member.exposure:>2}  catalyst {member.catalyst:>2}  "
                f"room {member.room:>2}"
            )
            lines.append(f"     next: {member.next_catalyst}")
            lines.append(f"     {member.thesis}")
        lines.append("")

    lines.append(f"Lone Wolves ({len(lone_wolves)}, not ranked): {' · '.join(lone_wolves)}")
    return "\n".join(lines)


def format_ranked_markdown(ranked_themes, lone_wolves: list[str], as_of: date) -> str:
    lines = [f"# Hot Themes — Ranked Constituents — {as_of.isoformat()}", ""]
    lines.append(
        "`leverage` is the mean of exposure (how much of the business the theme drives), "
        "catalyst (proximity of the next re-rating event) and room (how much of the thesis "
        "is still not priced). Ranking is competitive within shared-driver themes; for "
        "idiosyncratic themes the members are not substitutes and the ordering is weaker."
    )
    lines.append("")

    for theme in ranked_themes:
        corr = (
            f"{theme.average_correlation:+.2f}"
            if theme.average_correlation is not None
            else "n/a"
        )
        lines.append(f"## {theme.name}")
        lines.append("")
        lines.append(f"**Stage:** {theme.theme_durability}  ")
        lines.append(f"**Coherence:** {COHERENCE_LABELS[theme.coherence]} (10-day corr {corr})")
        lines.append("")
        lines.append(f"**Catalyst:** {theme.catalyst}")
        lines.append("")
        lines.append(f"**Context:** {theme.theme_context}")
        lines.append("")
        lines.append("| # | Ticker | Leverage | Exposure | Catalyst | Room | Next event |")
        lines.append("|---|--------|----------|----------|----------|------|------------|")
        for rank, member in enumerate(theme.constituents, start=1):
            lines.append(
                f"| {rank} | **{member.ticker}** | {member.leverage:.1f} | {member.exposure} "
                f"| {member.catalyst} | {member.room} | {member.next_catalyst} |"
            )
        lines.append("")
        for rank, member in enumerate(theme.constituents, start=1):
            lines.append(f"{rank}. **{member.ticker}** — {member.thesis}")
        lines.append("")

    lines.append("## Lone Wolves")
    lines.append("")
    lines.append(f"Not ranked ({len(lone_wolves)}): {' · '.join(lone_wolves)}")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Hot Theme Detection — narrative theme clustering")
    parser.add_argument("--out", help="save output as Markdown to this path")
    parser.add_argument(
        "--backend",
        choices=BACKENDS,
        default=DEFAULT_BACKEND,
        help=(
            "'claude-cli' (default) shells out to `claude -p`, needs no API key and draws on "
            "your Claude subscription's usage window; 'api' uses the Anthropic SDK, needs "
            "ANTHROPIC_API_KEY, and bills per token"
        ),
    )
    parser.add_argument(
        "--use-correlation",
        action="store_true",
        help=(
            f"dissolve themes whose average pairwise return correlation is below "
            f"{DEFAULT_CORRELATION_THRESHOLD} (strict; low correlation is often mechanism, "
            f"not error)"
        ),
    )
    parser.add_argument("--refresh", action="store_true", help="ignore enrichment/price caches")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="run enrichment and print the assembled LLM prompt, then exit before the API call",
    )
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    try:
        tickers = _run_screener(args.quiet)
    except requests.RequestException as error:
        print(f"Screener fetch failed: {error}", file=sys.stderr)
        return 1

    if not tickers:
        print("Screener returned no tickers.", file=sys.stderr)
        return 1

    if not args.quiet:
        print(f"Hot Theme Detection — {len(tickers)} tickers", file=sys.stderr)

    as_of = date.today()

    def _report_progress(index: int, total: int, enrichment) -> None:
        if not args.quiet:
            print(f"  enriched {index}/{total}: {enrichment.ticker}", file=sys.stderr)

    enrichments = enrich_tickers(
        tickers,
        as_of=as_of,
        refresh=args.refresh,
        on_progress=_report_progress,
    )

    with_foundational = sum(1 for e in enrichments if e.foundational_headlines)
    if not args.quiet:
        print(
            f"Foundational headlines "
            f"({DEFAULT_FOUNDATIONAL_MIN_DAYS}-{DEFAULT_FOUNDATIONAL_MAX_DAYS}d): "
            f"{with_foundational}/{len(enrichments)} tickers",
            file=sys.stderr,
        )
        if with_foundational == 0:
            print(
                "  none found — yfinance's news feed rarely reaches this far back; "
                "clustering is running on recent headlines + business summary only",
                file=sys.stderr,
            )

    if args.dry_run:
        print(build_prompt(enrichments))
        return 0

    if not args.quiet:
        print(f"Calling Claude for theme clustering (backend: {args.backend})...", file=sys.stderr)
    try:
        proposed_themes, proposed_lone_wolves = cluster_themes(enrichments, backend=args.backend)
    except RuntimeError as error:
        print(f"Theme clustering failed: {error}", file=sys.stderr)
        return 1
    if not args.quiet:
        print(
            f"Claude proposed {len(proposed_themes)} themes, "
            f"{len(proposed_lone_wolves)} lone wolves",
            file=sys.stderr,
        )

    end = as_of
    start = end - timedelta(days=int(DEFAULT_CORRELATION_WINDOW_DAYS * 2.5) + 10)
    if not args.quiet:
        print("Fetching price history for correlation check...", file=sys.stderr)
    price_history = fetch_close_history(
        tickers,
        start.isoformat(),
        end.isoformat(),
        refresh=args.refresh,
        quiet=args.quiet,
    )

    result = validate_themes(
        proposed_themes,
        proposed_lone_wolves,
        price_history=price_history,
        use_correlation=args.use_correlation,
        measure_correlation=True,
    )

    if not args.quiet:
        print(
            f"Validated {len(result.themes)} themes, {len(result.dissolved)} dissolved, "
            f"{len(result.lone_wolves)} lone wolves",
            file=sys.stderr,
        )

    by_ticker = {e.ticker: e for e in enrichments}
    ranked_themes = []
    for index, theme in enumerate(result.themes, start=1):
        if not args.quiet:
            print(
                f"Ranking {index}/{len(result.themes)}: {theme.name} "
                f"({theme.breadth} tickers, web search)...",
                file=sys.stderr,
            )
        try:
            ranked_themes.append(rank_theme(theme, by_ticker))
        except RuntimeError as error:
            print(f"  ranking failed for '{theme.name}': {error}", file=sys.stderr)

    if not ranked_themes:
        print("No themes could be ranked.", file=sys.stderr)
        return 1

    print(format_ranked_output(ranked_themes, result.lone_wolves))

    if args.out:
        with open(args.out, "w") as handle:
            handle.write(format_ranked_markdown(ranked_themes, result.lone_wolves, as_of))
        if not args.quiet:
            print(f"Saved -> {args.out}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
