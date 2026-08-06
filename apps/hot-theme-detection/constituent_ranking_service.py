"""
Stage 5 — within-theme constituent ranking.

Themes say where money is rotating; this says which names inside a theme have
the most left to capture. One web-search-enabled Claude call per theme, because
the question is about market context the enrichment does not contain: how much
of each company's revenue actually touches the theme, what the next dated
catalyst is, and how much of the move is already priced.

Each constituent is scored on three axes rather than given an opaque rank, so
the reasoning is inspectable and arguable:

  exposure  — share of the business genuinely driven by the theme. A pure play
              scores high; a conglomerate with a themed division scores low.
  catalyst  — proximity and concreteness of the next event that could re-rate
              it. A dated earnings call or PDUFA beats "continued momentum".
  room      — how much of the thesis is not yet in the price.

`leverage` is their mean and drives the ordering. Ties are broken by exposure:
when two names look equally good, the purer play is the better expression.

Correlation-aware by design. A theme whose members co-move on one external
driver (AI data-center buildout) is a horse race, and ranking answers "who
captures the next leg". A theme whose members move on their own events
(announced takeouts, post-earnings repricings) is not a horse race at all, and
the prompt says so explicitly — there, per-ticker durability is the useful
output and a forced 1-to-N ordering would be false precision.
"""

from dataclasses import dataclass

from claude_cli_client import call_claude_cli
from enrichment_client import TickerEnrichment
from theme_clustering_service import MODEL, format_ticker_block
from theme_validation_service import ValidatedTheme

CORRELATED_THRESHOLD = 0.55
IDIOSYNCRATIC_THRESHOLD = 0.20

SHARED_DRIVER = "shared-driver"
MIXED = "mixed"
IDIOSYNCRATIC = "idiosyncratic"
UNKNOWN = "unknown"

RANK_CONSTITUENTS_TOOL = {
    "name": "rank_constituents",
    "input_schema": {
        "type": "object",
        "properties": {
            "theme_context": {
                "type": "string",
                "description": (
                    "What is driving this theme right now and how it is likely to evolve over "
                    "the next 1-3 months, based on what you found searching. Name the specific "
                    "mechanism, the stage it is at, and what would end it."
                ),
            },
            "theme_durability": {
                "type": "string",
                "enum": ["early", "mid", "late", "fading"],
                "description": (
                    "Where this theme sits in its own lifecycle: 'early' if the catalyst is "
                    "still unfolding and most participants have not repriced, 'late' if the "
                    "move is largely complete, 'fading' if the driver is weakening or reversing."
                ),
            },
            "constituents": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "ticker": {"type": "string"},
                        "exposure": {
                            "type": "integer",
                            "minimum": 1,
                            "maximum": 10,
                            "description": (
                                "How much of this company's economics the theme actually drives. "
                                "10 = pure play, revenue is the theme. 3 = a real but minority "
                                "exposure. 1 = swept along by association with little underlying "
                                "exposure. Be skeptical of large diversified companies."
                            ),
                        },
                        "catalyst": {
                            "type": "integer",
                            "minimum": 1,
                            "maximum": 10,
                            "description": (
                                "Proximity and concreteness of the next identifiable event that "
                                "could re-rate this name. 10 = a dated, high-impact event within "
                                "weeks. 1 = nothing specific identified."
                            ),
                        },
                        "room": {
                            "type": "integer",
                            "minimum": 1,
                            "maximum": 10,
                            "description": (
                                "How much of the thesis is still not in the price. 10 = the "
                                "market has barely discounted it. 1 = fully priced or beyond. "
                                "A name already up several hundred percent on this theme has "
                                "little room even if exposure is total."
                            ),
                        },
                        "thesis": {
                            "type": "string",
                            "description": (
                                "Two or three sentences: how this name is exposed to the theme, "
                                "what specifically happens next, and the single biggest risk to "
                                "it continuing. Cite what you found, not generic commentary."
                            ),
                        },
                        "next_catalyst": {
                            "type": "string",
                            "description": (
                                "The specific next event and its date or window if known, e.g. "
                                "'Q3 earnings ~Nov 12' or 'PDUFA date Oct 2026'. Say 'none "
                                "identified' rather than inventing one."
                            ),
                        },
                    },
                    "required": [
                        "ticker",
                        "exposure",
                        "catalyst",
                        "room",
                        "thesis",
                        "next_catalyst",
                    ],
                },
            },
        },
        "required": ["theme_context", "theme_durability", "constituents"],
    },
}

SYSTEM_PROMPT = """You are ranking the constituents of a single market theme by how much of the \
theme's next leg each one is positioned to capture. These stocks are all already in confirmed \
uptrends — that they have gone up is established and is not evidence for anything. Your job is \
forward-looking.

Use web search. Your training data ends before the events driving this theme, so any judgement \
you make from memory alone is worthless here. Search for the theme's driver, then for the \
specific names, before scoring anything.

Score every constituent on exposure, catalyst and room. The scores must discriminate — if you \
rate every name 7-8 you have not done the work. Real cohorts contain pure plays and passengers, \
and saying which is which is the entire point.

Be specific about what you actually found. If search does not tell you a name's exposure, say so \
in its thesis and score exposure low on the basis of not being established, rather than assuming \
a middling number. Never invent a catalyst date; 'none identified' is a real and useful answer.

Two failure modes to avoid:
- Ranking by how much a stock has already moved. A name up 300% on this theme has proven its \
exposure and spent its room. Those pull in opposite directions and both belong in the scores.
- Assuming a large company benefits proportionally. If the themed business is 4% of revenue, \
exposure is low no matter how real the driver is."""

SHARED_DRIVER_GUIDANCE = """This theme's members move together (measured return correlation \
{correlation:+.2f} over the last 10 sessions), which means one external driver is hitting all of \
them at once. Ranking is genuinely competitive here: they are drawing on the same pool of flow, \
so who captures the next leg is a real question with a real answer. Discriminate hard."""

IDIOSYNCRATIC_GUIDANCE = """This theme's members do NOT move together (measured return \
correlation {correlation:+.2f} over the last 10 sessions). They share a narrative but each one is \
moving on its own events. Do not manufacture a horse race. Score each name on its own durability \
and rank on that, and say plainly in theme_context that these names are not substitutes for one \
another and the ordering is weaker than it would be for a genuinely correlated cohort. If the \
reason for the low correlation is structural — for example names pinned to announced acquisition \
prices, which decouple from everything by design — say that explicitly."""

MIXED_GUIDANCE = """This theme's members co-move only loosely (measured return correlation \
{correlation:+.2f} over the last 10 sessions): a shared category with meaningful \
name-specific dispersion. Rank them, but note in theme_context which names are moving on the \
shared driver and which are moving on their own events."""

UNKNOWN_GUIDANCE = """Return correlation for this theme could not be measured, so treat the \
strength of the shared driver as unestablished and say so in theme_context."""


@dataclass
class RankedConstituent:
    ticker: str
    exposure: int
    catalyst: int
    room: int
    thesis: str
    next_catalyst: str

    @property
    def leverage(self) -> float:
        return (self.exposure + self.catalyst + self.room) / 3.0


@dataclass
class RankedTheme:
    name: str
    catalyst: str
    theme_context: str
    theme_durability: str
    coherence: str
    average_correlation: float | None
    constituents: list[RankedConstituent]


def classify_coherence(average_correlation: float | None) -> str:
    """
    Which kind of object a theme is, from how tightly its members co-move.

    This is not a quality judgement. An idiosyncratic theme can be the most
    tradeable one on the list — deal spreads are uncorrelated precisely
    because each is pinned to its own announced price.
    """
    if average_correlation is None:
        return UNKNOWN
    if average_correlation >= CORRELATED_THRESHOLD:
        return SHARED_DRIVER
    if average_correlation <= IDIOSYNCRATIC_THRESHOLD:
        return IDIOSYNCRATIC
    return MIXED


def _coherence_guidance(coherence: str, average_correlation: float | None) -> str:
    if coherence == UNKNOWN or average_correlation is None:
        return UNKNOWN_GUIDANCE
    template = {
        SHARED_DRIVER: SHARED_DRIVER_GUIDANCE,
        IDIOSYNCRATIC: IDIOSYNCRATIC_GUIDANCE,
        MIXED: MIXED_GUIDANCE,
    }[coherence]
    return template.format(correlation=average_correlation)


def build_prompt(
    theme: ValidatedTheme,
    enrichments: dict[str, TickerEnrichment],
    coherence: str,
) -> str:
    blocks = "\n\n".join(
        format_ticker_block(enrichments[ticker])
        for ticker in theme.tickers
        if ticker in enrichments
    )
    ticker_list = ", ".join(theme.tickers)
    return (
        f"# Theme: {theme.name}\n\n"
        f"Catalyst as identified by clustering: {theme.catalyst}\n\n"
        f"Constituents ({len(theme.tickers)}): {ticker_list}\n\n"
        f"{_coherence_guidance(coherence, theme.average_correlation)}\n\n"
        f"## What we already know about each constituent\n\n{blocks}\n\n"
        "Search for the current state of this theme and for each constituent's exposure to it, "
        "then call rank_constituents. Every constituent listed above must appear exactly once."
    )


def parse_response(payload: dict) -> tuple[str, str, list[RankedConstituent]]:
    constituents = [
        RankedConstituent(
            ticker=item["ticker"].upper(),
            exposure=int(item["exposure"]),
            catalyst=int(item["catalyst"]),
            room=int(item["room"]),
            thesis=item["thesis"],
            next_catalyst=item["next_catalyst"],
        )
        for item in payload.get("constituents", [])
    ]
    constituents.sort(key=lambda c: (c.leverage, c.exposure), reverse=True)
    return (
        payload.get("theme_context", ""),
        payload.get("theme_durability", ""),
        constituents,
    )


def rank_theme(
    theme: ValidatedTheme,
    enrichments: dict[str, TickerEnrichment],
    timeout_seconds: int = 900,
) -> RankedTheme:
    coherence = classify_coherence(theme.average_correlation)
    prompt = f"{SYSTEM_PROMPT}\n\n{build_prompt(theme, enrichments, coherence)}"

    payload = call_claude_cli(
        prompt=prompt,
        json_schema=RANK_CONSTITUENTS_TOOL["input_schema"],
        model=MODEL,
        timeout_seconds=timeout_seconds,
        allowed_tools="WebSearch",
    )

    theme_context, theme_durability, constituents = parse_response(payload)
    return RankedTheme(
        name=theme.name,
        catalyst=theme.catalyst,
        theme_context=theme_context,
        theme_durability=theme_durability,
        coherence=coherence,
        average_correlation=theme.average_correlation,
        constituents=constituents,
    )
