"""
Ticker enrichment: fundamentals + two news windows, cached to disk.

Source is `yfinance` `Ticker.info` and `Ticker.news` — free, sufficient for a
prototype. Swapping to Polygon.io or Benzinga for higher news volume and
reliability on smaller-cap names only requires reimplementing `fetch_news`
below with the same return shape; `enrich_ticker` and the cache never need to
change.

`Ticker.news` returns whatever Yahoo currently has cached for the symbol, most
recent first, nested under a `content` key with an ISO `pubDate` string. There
is no real historical archive behind it: in practice it rarely reaches back
further than 1-2 weeks even at `count=50`, so the 30-90 day "foundational"
window is frequently thin or empty. Callers must treat that window as
best-effort, not guaranteed.
"""

import json
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import yfinance as yf

CACHE_DIR = Path(__file__).parent / "data" / "enrichment"

DEFAULT_RECENT_MIN_DAYS = 7
DEFAULT_RECENT_MAX_DAYS = 14
DEFAULT_FOUNDATIONAL_MIN_DAYS = 30
DEFAULT_FOUNDATIONAL_MAX_DAYS = 90
NEWS_FETCH_COUNT = 50
HEADLINES_PER_WINDOW = 5


def to_yahoo_symbol(ticker: str) -> str:
    """TradingView spells dual-class shares BRK.A; Yahoo expects BRK-A."""
    return ticker.replace(".", "-")


@dataclass
class Headline:
    title: str
    published_at: str
    summary: str = ""


@dataclass
class TickerEnrichment:
    ticker: str
    name: str = ""
    sector: str = ""
    industry: str = ""
    business_summary: str = ""
    recent_headlines: list[Headline] = field(default_factory=list)
    foundational_headlines: list[Headline] = field(default_factory=list)


def _cache_path(ticker: str, as_of: date) -> Path:
    return CACHE_DIR / f"{ticker}-{as_of.isoformat()}.json"


def _load_cached(ticker: str, as_of: date) -> TickerEnrichment | None:
    path = _cache_path(ticker, as_of)
    if not path.exists():
        return None
    payload = json.loads(path.read_text())
    payload["recent_headlines"] = [Headline(**h) for h in payload["recent_headlines"]]
    payload["foundational_headlines"] = [
        Headline(**h) for h in payload["foundational_headlines"]
    ]
    return TickerEnrichment(**payload)


def _store_cache(enrichment: TickerEnrichment, as_of: date) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = _cache_path(enrichment.ticker, as_of)
    payload = asdict(enrichment)
    path.write_text(json.dumps(payload, indent=2))


def fetch_fundamentals(ticker: str) -> dict[str, str]:
    """
    Company name, GICS sector/industry, and business summary via yfinance.

    Returns empty strings for any field yfinance does not have, rather than
    raising — a ticker with thin info coverage must still flow through.
    """
    try:
        info = yf.Ticker(to_yahoo_symbol(ticker)).info
    except Exception:
        info = {}

    name = info.get("longName") or info.get("shortName") or ""
    return {
        "name": name,
        "sector": info.get("sector") or "",
        "industry": info.get("industry") or "",
        "business_summary": info.get("longBusinessSummary") or "",
    }


def fetch_news(ticker: str, count: int = NEWS_FETCH_COUNT) -> list[Headline]:
    """
    Raw headline feed for `ticker`, most recent first.

    This is the swappable seam: replacing the yfinance call below with a
    Polygon.io or Benzinga client that returns the same list[Headline] shape
    is the only change needed to upgrade news sourcing across the app.
    """
    try:
        raw_items = yf.Ticker(to_yahoo_symbol(ticker)).get_news(count=count)
    except Exception:
        return []

    headlines: list[Headline] = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        content = item.get("content") or item
        if not isinstance(content, dict):
            continue
        title = content.get("title") or ""
        published_at = content.get("pubDate") or content.get("displayTime") or ""
        summary = content.get("summary") or ""
        if not title or not published_at:
            continue
        headlines.append(Headline(title=title, published_at=published_at, summary=summary))
    return headlines


def _parse_timestamp(value: str) -> datetime | None:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def split_into_windows(
    headlines: list[Headline],
    now: datetime,
    recent_min_days: int = DEFAULT_RECENT_MIN_DAYS,
    recent_max_days: int = DEFAULT_RECENT_MAX_DAYS,
    foundational_min_days: int = DEFAULT_FOUNDATIONAL_MIN_DAYS,
    foundational_max_days: int = DEFAULT_FOUNDATIONAL_MAX_DAYS,
    headlines_per_window: int = HEADLINES_PER_WINDOW,
) -> tuple[list[Headline], list[Headline]]:
    """
    Partition headlines into (recent, foundational) windows by age.

    `recent` covers the last `recent_max_days` (the `recent_min_days` bound is
    accepted for symmetry with the spec but does not exclude anything — the
    freshest available headlines are always the most useful "what's
    happening now" signal). `foundational` covers `foundational_min_days` to
    `foundational_max_days` ago, deliberately excluding the recent window so
    the two do not double-count the same headline.

    Each window is capped at `headlines_per_window`, newest first.
    """
    recent: list[Headline] = []
    foundational: list[Headline] = []

    for headline in headlines:
        published = _parse_timestamp(headline.published_at)
        if published is None:
            continue
        age_days = (now - published).total_seconds() / 86400.0

        if age_days <= recent_max_days:
            recent.append(headline)
        elif foundational_min_days <= age_days <= foundational_max_days:
            foundational.append(headline)

    recent.sort(key=lambda h: h.published_at, reverse=True)
    foundational.sort(key=lambda h: h.published_at, reverse=True)
    return recent[:headlines_per_window], foundational[:headlines_per_window]


def enrich_ticker(
    ticker: str,
    as_of: date | None = None,
    refresh: bool = False,
    **window_kwargs: Any,
) -> TickerEnrichment:
    """
    Full Stage 1 enrichment for one ticker: fundamentals + both news windows.

    Cached to disk under data/enrichment/, keyed by ticker and `as_of` date,
    so iterating on the LLM prompt costs no network after the first run.
    """
    resolved_as_of = as_of or date.today()

    if not refresh:
        cached = _load_cached(ticker, resolved_as_of)
        if cached is not None:
            return cached

    fundamentals = fetch_fundamentals(ticker)
    headlines = fetch_news(ticker)
    now = datetime.now(timezone.utc)
    recent, foundational = split_into_windows(headlines, now, **window_kwargs)

    enrichment = TickerEnrichment(
        ticker=ticker,
        name=fundamentals["name"],
        sector=fundamentals["sector"],
        industry=fundamentals["industry"],
        business_summary=fundamentals["business_summary"],
        recent_headlines=recent,
        foundational_headlines=foundational,
    )
    _store_cache(enrichment, resolved_as_of)
    return enrichment


def enrich_tickers(
    tickers: list[str],
    as_of: date | None = None,
    refresh: bool = False,
    on_progress: Any = None,
    **window_kwargs: Any,
) -> list[TickerEnrichment]:
    results = []
    for index, ticker in enumerate(tickers, start=1):
        enrichment = enrich_ticker(ticker, as_of=as_of, refresh=refresh, **window_kwargs)
        if on_progress is not None:
            on_progress(index, len(tickers), enrichment)
        results.append(enrichment)
    return results
