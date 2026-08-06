# Hot Theme Detection — Specification

## Purpose

Given a list of tickers produced by a momentum screener, automatically identify which **current market themes** are driving the strongest moves, rank those themes by signal strength, and surface tickers that do not belong to any theme ("lone wolves").

The goal is not to categorize companies by their business type (that is what GICS sectors do), but to answer the question: **why are these stocks moving together right now?**

---

## Problem with Naive Clustering

Standard approaches fall short for different reasons:

- **GICS sector/industry grouping** — splits cross-sector themes. "AI Infrastructure" would be fragmented across Semiconductors, REITs, Utilities, and Communications. The shared narrative is invisible.
- **Business description only** — describes what a company does structurally, not why it is moving today. SNDK's description says "flash storage manufacturer." It does not say "primary beneficiary of AI data center NAND demand surge and supply tightening in 2025." The catalyst is absent from the description.
- **Forced clustering** — every ticker must belong to a group. This manufactures fake themes from lone-wolf movers (earnings beats, FDA approvals, short squeezes) that have no shared narrative.

---

## Core Design Principles

1. **Themes are narrative, not categorical.** A theme is a shared current market catalyst, not a shared SIC code.
2. **Not every ticker belongs to a theme.** Lone wolves are a valid and important output category.
3. **The LLM synthesizes; Python validates.** The LLM identifies candidate themes from semantic signals. Python enforces a minimum breadth check and an optional correlation check to confirm or reject them.
4. **Two data layers per ticker are sufficient.** The screener already pre-qualifies every ticker technically. Theme detection only needs to answer what the company does and what is happening to it right now — not how it is moving.

---

## Input

The algorithm accepts the output of a momentum screener with the following criteria already applied:

- Close price > $2
- Market cap > $300M
- 30-day average dollar volume > $30M
- EMA10 > EMA20 > SMA50 and close > EMA20
- Market: US equities

The input is a list of ticker symbols. All tickers are already confirmed to be in a technical uptrend. Technical indicators are not carried forward into the theme detection pipeline.

---

## Pipeline

### Stage 1 — Ticker Enrichment

For each ticker, collect two layers of data:

**Fundamental layer**
- Company full name
- GICS sector and industry (for context only, not used as a clustering key)
- Long business summary (1–3 sentence description of what the company does)

Source: `yfinance` `Ticker.info` (free, sufficient for prototype). Production alternative: Financial Modeling Prep (FMP) API for faster bulk fetching.

**Catalyst layer**

News is collected in two separate windows and passed to the LLM with explicit labels:

- **Recent headlines** (last 7–14 days): captures what is happening right now — incremental developments, earnings, guidance updates
- **Foundational headlines** (last 30–90 days): captures the original catalyst that launched the theme — the event or narrative that started the move

Aim for 3–5 headlines per window per ticker. The two-window approach reflects how themes actually work in markets: a theme emerges from a foundational event and is sustained by ongoing developments. Collapsing both into a single window either misses the origin (too short) or buries it in noise (too long).

Source: `yfinance` `Ticker.news` (free, Yahoo Finance feed). Production alternative: Polygon.io news API or Benzinga for higher volume and reliability, especially for smaller-cap tickers.

The combination of business description, foundational headlines, and recent headlines gives the LLM three complementary signals: what the company does structurally, why it started moving, and what is sustaining the move. None of the three alone is sufficient.

---

### Stage 2 — LLM Theme Clustering

Send the enriched ticker list to an LLM (Claude API) in a single prompt.

**What the prompt provides per ticker:**
- Ticker symbol and company name
- Business summary (1–2 sentences)
- 3–5 foundational headlines (last 30–90 days)
- 3–5 recent headlines (last 7–14 days)

**What the prompt instructs the LLM to do:**
- Identify groups of tickers sharing a genuine current market narrative — a reason they are all moving together *right now*
- Name each theme concisely (e.g. "AI Infrastructure Buildout", "China EV Restart", "GLP-1 Drug Ecosystem")
- Write one sentence explaining the shared catalyst
- List which tickers belong to each theme
- List all remaining tickers as **Lone Wolves** — do not force-fit tickers that lack a clear shared narrative
- A theme requires a minimum of 3 tickers; two companies in the same space is a coincidence, not a theme

The LLM returns structured output: a list of themes with their tickers, and a lone wolf list.

---

### Stage 3 — Quantitative Theme Validation

Python validates each LLM-proposed theme before it is accepted.

**Minimum breadth**
The theme must contain at least 3 tickers. Themes with fewer tickers are dissolved and their tickers moved to lone wolves.

**Return correlation (optional, recommended for v2)**
Compute the pairwise return correlation matrix for the theme's tickers over the last 10 trading days. The average pairwise correlation should exceed a threshold (suggested starting point: 0.4). This confirms that the tickers are actually moving together in the market, not just sharing a plausible narrative that the LLM connected.

Themes that fail validation are dissolved. Their tickers become lone wolves.

---

### Stage 4 — Theme Scoring

Each validated theme receives a score used for ranking. Since all tickers already pass the same technical bar, the score focuses on how widespread and confirmed the theme is — not on individual ticker momentum.

**Breadth score**
Number of tickers in the theme. More participants = stronger market-wide confirmation of the theme.

**Correlation score (v2)**
Average pairwise return correlation across the theme's tickers over the last 10 days. Higher correlation means the tickers are genuinely moving as a group.

**Final score**
In v1: breadth only. In v2: weighted combination of breadth and average correlation.

---

## Output

### Ranked Themes

For each theme, in descending score order:

```
Theme: AI Infrastructure Buildout
Catalyst: AI capex cycle driving demand for compute, storage, and power infrastructure
Tickers (8): NVDA · AVGO · SNDK · VST · ETN · EQIX · ARM · SMCI
```

### Lone Wolves

A flat list of tickers that passed the screener but do not belong to any validated theme. These may be worth examining individually — they could represent company-specific catalysts (earnings beat, product launch, acquisition) that are legitimate opportunities but not part of a broader wave.

```
Lone Wolves (12): CELH · MNDY · AEHR · DOCN · ...
```

---

## Implementation Stages

### v1 — Prototype
- Enrichment via `yfinance` (description + news)
- Single LLM call for clustering
- Validation: breadth ≥ 3 only
- Output: printed to terminal or saved as Markdown

### v2 — Validated
- Add return correlation check to validation and scoring
- Improve news sourcing (Polygon.io or Benzinga)
- Tune correlation threshold against known historical theme periods

### v3 — Production
- Scheduled daily run (post-market or pre-market)
- Output saved as Obsidian note with date stamp
- Optional: second LLM call per theme to generate a paragraph-length narrative for deeper context

---

## Open Questions

- **News source reliability**: `yfinance` news coverage is thin for smaller-cap tickers and its historical depth is limited — it may not reliably return 90-day-old headlines. Need to evaluate whether Polygon.io free tier is sufficient or if Benzinga is required for the foundational window.
- **Foundational window length**: 30–90 days is a wide range. A theme that emerged 3 months ago may need the full 90 days; a fast-moving theme from 3 weeks ago would be diluted by 90 days of noise. May need to make this configurable or let the LLM select the most relevant headlines from a fixed large window.
- **Correlation threshold**: 0.4 is a starting guess. Needs calibration against known theme periods (e.g. AI Infrastructure in Q1 2025).
- **LLM prompt tuning**: The quality of theme names and narratives will depend heavily on prompt design. Should be iterated against real screener outputs before treating as production-ready.
- **Screener input format**: The current screener scripts produce output in a format that needs to be confirmed before wiring up Stage 1.
