# Hot Theme Detection

Given a list of tickers from a momentum screener, identifies which **current market themes** are
driving the strongest moves, ranks those themes, and surfaces the tickers that don't belong to any
theme ("lone wolves").

A standalone analytical tool implementing v1 + v2 of `Hot-Theme-Detection.md` (the spec lives at the
repo root). It has no `package.json`, so it is invisible to `npm ci`, the Turborepo pipeline, and the
repo's quality-gate hook. It does not import from the other apps and does not touch the Blue Star
database.

## Pipeline

```
screener_client -> enrichment_client -> theme_clustering_service -> theme_validation_service
(TradingView)      (yfinance)           (Claude, one of two backends)  (breadth; correlation measured)
                                                                                  |
                                                          constituent_ranking_service -> output
                                                          (Claude + WebSearch, one call per theme)
```

1. **Enrichment** (`enrichment_client.py`) — for each ticker: company name, GICS sector/industry,
   business summary, and two news windows (recent 7-14d, foundational 30-90d) via `yfinance`.
   Cached to disk under `data/enrichment/`, keyed by ticker + date, so iterating on the LLM prompt
   costs no network after the first run.
2. **Clustering** (`theme_clustering_service.py`) — a single Claude call. The enriched tickers are
   built into one prompt and JSON schema once, then handed to whichever backend `--backend` selects
   (`claude-cli` by default, `api` as the alternative — see "Choosing a backend" below). Both force
   schema-conformant structured output rather than prose to regex-parse.
3. **Validation & scoring** (`theme_validation_service.py`) — pure functions, no I/O. Breadth is the
   only gate: a theme needs at least `MIN_BREADTH` tickers (3) or it dissolves, its tickers
   becoming lone wolves. Correlation is **always measured but not gating**; `--use-correlation` turns
   it into a hard gate, which is deliberately not the default — see "Correlation measures mechanism,
   not validity" below. Measurement is unconditional because stage 4 consumes it: the coherence class
   it produces decides which guidance the ranking prompt gets.
4. **Constituent ranking** (`constituent_ranking_service.py`) — one web-search-enabled Claude call
   per surviving theme, ranking its members by **theme leverage**: the mean of `exposure` (how much
   of the business the theme actually drives), `catalyst` (proximity of the next re-rating event) and
   `room` (how much of the thesis is still unpriced). Web search is required, not optional: the
   question is how a theme will evolve, and the model's training data predates the catalysts driving
   it. This stage is unconditional — it is the point of the tool — and it is the expensive one: N
   themes means N calls, so a 16-theme run is 16 calls and takes ~45 minutes. `--dry-run` stops
   before any of it.

## Choosing a backend

Two backends produce identical output; only how the Claude call is made differs.

- **`claude-cli` (default)** — shells out to `claude -p --json-schema ... --output-format json`.
  Authenticates as your existing Claude Code login, so **no `ANTHROPIC_API_KEY` is required**. This
  is why it's the default: most people running this app interactively already have `claude`
  installed and logged in, and not everyone has a standalone API key.
- **`api`** — the `anthropic` Python SDK with a forced tool call. Requires `ANTHROPIC_API_KEY` in
  the environment.

**On a Claude subscription, `claude -p` incurs no per-call dollar charge.** It draws against the
account's usage window instead of billing per token — a real call during development reported
`apiKeySource: "none"` and `rateLimitType: "five_hour"`, the same 5-hour window interactive Claude
Code use shares. The CLI's `total_cost_usd` field (it printed **$0.43** on a 6-ticker call) is a
**notional API-equivalent token cost, not a bill** — it's what those tokens would cost at API rates,
useful for understanding scale, misleading if read as an actual charge.

**The real resource this backend spends is quota, not dollars.** `claude -p` boots a full Claude
Code session — hooks, skills, MCP server registration, plugin discovery, the whole CLAUDE.md/session
preamble — before it ever sees the clustering prompt. That 6-ticker call logged **40,335
cache-creation input tokens**, essentially all of it session boot rather than the actual prompt, and
every invocation pays that cost again. Run this backend frequently — especially alongside interactive
Claude Code use — and it can noticeably eat into the 5-hour window; exceeding it falls under your
plan's overage behavior. `--allowedTools ""` is passed on every `claude-cli` call, but that's a
scope/risk mitigation (stopping the model from touching the filesystem or any MCP server), not a
quota mitigation — the session preamble is paid regardless. `--bare` (Claude Code's own
minimal-preamble mode) was tried as a mitigation and rejected: it hard-requires
`ANTHROPIC_API_KEY`/`apiKeyHelper` and refuses OAuth login outright, which defeats the entire reason
this backend exists.

**Batch tickers into one call rather than running many small ones.** The ~40k-token preamble is paid
per invocation, not per ticker, so one 30-ticker call spends far less quota than ten 3-ticker calls.
`--dry-run` consumes neither quota nor dollars — keep using it while iterating on the prompt or window
thresholds, and only run a real backend call once the assembled prompt looks right.

**With `--backend api` and a real API key, the token cost is a genuine dollar charge** — billed at
standard Messages API rates, no subscription quota involved. That's the actual contrast between the
two backends: `claude-cli` spends your subscription's usage window and needs no key; `api` spends
real dollars per call and needs one.

## Usage

```bash
./setup.sh
source venv/bin/activate

# The whole app. Screens TradingView (top 2% of each of Perf.1M/3M/6M, merged
# and deduplicated — about 90 names from ~1,900), clusters into themes, then
# ranks every theme's constituents. Default backend (claude-cli) — no API key
# needed, uses your Claude Code login. Expect ~45 minutes on a full run.
python main.py

# Cheaper path if you have an API key (applies to clustering; ranking always
# goes through claude-cli because it needs WebSearch)
python main.py --backend api

# Save the ranked output as Markdown alongside the terminal printout
python main.py --out themes-ranked.md

# Strict: dissolve themes whose correlation is below 0.4. Not the default —
# low correlation is usually mechanism, not error. See the correlation section.
python main.py --use-correlation

# Inspect the assembled LLM prompt without calling either backend or needing any
# credential. Still screens and enriches first, so it is not instant.
python main.py --dry-run

# Re-fetch instead of reading the enrichment/price caches
python main.py --refresh

python -m pytest tests/ -v
```

Everything else is a constant, not a flag — see "Tuning" below.

Progress goes to stderr; the ranked themes and lone-wolf list print to stdout in the spec's format,
so stdout stays clean and redirectable. Neither backend's credential is ever printed, logged, or
written anywhere by this app; if the selected backend's credential is missing (`ANTHROPIC_API_KEY`
for `api`, the `claude` binary on PATH for `claude-cli`) you get an actionable error before any call
is made.

## Input handling

There is no input to supply and nothing to configure: the working list is always built by
`screener_client.py` from the TradingView momentum screener at the module's own `DEFAULT_TOP_PERCENT`.
An earlier version accepted `--tickers`, `--universe-file` and `--screener-csv`, a `--screen` flag to
opt into screening, and a `--top-percent` override; all are gone.

Collapsing to one path removed a real footgun as well as three code paths. Resolution was
first-match-wins with `--screen` checked _last_, so `--tickers NVDA,AVGO --screen` silently ignored
the screener and analyzed two names. The manual paths also accepted any string as a ticker: yfinance
degrades gracefully rather than raising (see below), so a typo flowed through to Claude as a
summary-less, headline-less ticker and came back a lone wolf. Screening is now the only path, so
every ticker analyzed has provably cleared the size and liquidity floors.

The cost is that iterating on the prompt is no longer cheap. `--dry-run` still skips both Claude
backends, but it screens and enriches ~90 tickers first, and there is no longer a `--top-percent` to
trim that down — edit `DEFAULT_TOP_PERCENT` in `screener_client.py` if you want a short list while
iterating. The enrichment cache makes same-day re-runs local.

## Tuning

Every tuning parameter is a module-level constant, deliberately not a flag. The full run is one
fixed, reproducible configuration; two people running `python main.py` on the same day get the same
working list and the same gates. To change behavior, edit the constant:

| Constant                                                          | Value  | Module                     |
| ----------------------------------------------------------------- | ------ | -------------------------- |
| `DEFAULT_TOP_PERCENT`                                             | 2.0    | `screener_client.py`       |
| `MIN_BREADTH`                                                     | 3      | `theme_validation_service` |
| `DEFAULT_CORRELATION_WINDOW_DAYS`                                 | 10     | `theme_validation_service` |
| `DEFAULT_CORRELATION_THRESHOLD`                                   | 0.4    | `theme_validation_service` |
| `DEFAULT_RECENT_MIN_DAYS` / `DEFAULT_RECENT_MAX_DAYS`             | 7 / 14 | `enrichment_client.py`     |
| `DEFAULT_FOUNDATIONAL_MIN_DAYS` / `DEFAULT_FOUNDATIONAL_MAX_DAYS` | 30/ 90 | `enrichment_client.py`     |

The functions still take these as keyword arguments with the constants as defaults, so the tests
exercise off-default values directly and a future caller can override them in process. Only the CLI
surface is fixed.

## Swapping the news source

`enrichment_client.fetch_news()` is the entire seam. It returns `list[Headline]` — the shape
`theme_clustering_service` and the rest of the pipeline consume. Replacing the yfinance call inside
it with a Polygon.io or Benzinga client that returns the same shape is the only change needed to
upgrade news sourcing; nothing downstream needs to change. `fetch_fundamentals()` is a separate,
equally swappable seam for company info (e.g. to Financial Modeling Prep).

## What running this against real tickers revealed

**The spec's description of `yfinance.Ticker.news` is stale.** It now nests fields under a
`content` key (`item["content"]["title"]`, not `item["title"]`) and timestamps are an ISO string
(`pubDate`) rather than a Unix epoch (`providerPublishTime`). `fetch_news()` handles the current
shape; if yfinance changes it again, this is the one place that needs to change too.

**The foundational (30-90d) window depends entirely on how heavily covered the ticker is.** The
binding constraint is the hard 10-item cap on `Ticker.news`/`get_news()`, not the age of Yahoo's
archive: raising `count` to 50 changes nothing because Yahoo returns at most 10. For a mega-cap,
same-day coverage alone fills all 10 slots, so nothing older than today survives the cap. Measured
age-in-days of the returned items, oldest to newest (yfinance 1.5.2, independently confirmed on
0.2.66):

| Ticker | Items | Age in days (oldest → newest)  |
| ------ | ----- | ------------------------------ |
| NVDA   | 10    | 0, 0, 0, 0, 0, 0, 0, 0, 0, 0   |
| AVGO   | 10    | 0, 0, 0, 0, 0, 0, 0, 0, 0, 0   |
| SNDK   | 10    | 0, 0, 0, 0, 0, 0, 0, 0, 0, 0   |
| VST    | 10    | 0, 0, 0, 1, 1, 1, 2, 4, 5, 5   |
| ETN    | 10    | 0, 0, 1, 1, 1, 1, 1, 3, 4, 4   |
| AEHR   | 10    | 0, 0, 2, 4, 4, 4, 5, 7, 11, 13 |

An earlier version of this section generalized that table into "the foundational window is
effectively unreachable." **That was wrong, and a real run disproved it.** On the 93-ticker momentum
working list the screener actually produces, `Foundational headlines (30-90d): 78/93 tickers` — 84%
coverage, not zero. The table above is a mega-cap sample, and mega-caps are the worst case for a
10-item cap. Mid-cap momentum names get a few articles spread over weeks, so their 10 items reach
back comfortably past 30 days.

So the spec's three-signal design does hold for this app's actual input class, and the run-level
stderr line is what tells you whether it held on any given run. The Polygon.io/Benzinga swap is
still worth making — it would fix the mega-cap case and remove the dependence on coverage
thinness — but it is an improvement, not a repair of a broken layer.

**The prompt never silently omits the foundational section.** When a ticker has no foundational
headlines, its block says so explicitly — `NO FOUNDATIONAL HEADLINES AVAILABLE for this ticker — do
not invent an origin story...` — rather than just leaving the section out. An LLM handed a
silently-missing section tends to confabulate a plausible-sounding origin story to fill it; one told
outright that the data is missing leans on the business summary and recent headlines instead, which
is what Stage 2's system prompt also explicitly instructs. `main.py` additionally prints a run-level
line to stderr — `Foundational headlines (30-90d): N/M tickers` — so the operator sees the layer is
degraded rather than discovering it later in bad theme catalysts. The window thresholds are the
`DEFAULT_RECENT_*`/`DEFAULT_FOUNDATIONAL_*` constants in `enrichment_client.py`, and
`split_into_windows` still takes them as keyword arguments — so a better news source can widen or
shift them by changing one constant.

**The per-ticker news feed is not always about that ticker.** Yahoo's `Ticker.news` for NVDA
included headlines about Alphabet, Apple, and unrelated Q2 earnings calls — general market news
mixed into the per-symbol feed, not just NVDA-specific stories. The clustering prompt passes these
through as-is; Claude is instructed to look for a genuine shared catalyst, which should discount
generic noise, but a noisier feed than expected is worth knowing about when reading a real prompt.

**`Ticker.info` and `Ticker.news` degrade gracefully, they don't raise.** An invalid/delisted ticker
returns a near-empty `info` dict and an empty `news` list rather than throwing — `fetch_fundamentals`
and `fetch_news` still wrap the calls in `try/except` for network-level failures, but the "ticker
with no news must still flow through" requirement holds even without that, empirically.

**A real `claude-cli` run against NVDA/AVGO/SNDK returned zero themes — correctly.** With no
foundational headlines and only generic recent news for all three, Claude declined to invent an "AI
chips" theme and reported all three as lone wolves instead. That's the system prompt's "do not
force-fit" and "do not cluster by industry alone" rules working as intended, not a bug — three
similar chip names sharing a sector is exactly the kind of GICS-flavored grouping the spec explicitly
rejects as a fake theme. It does mean small/thin test runs are a poor way to eyeball theme quality;
a larger, more differentiated ticker list is needed to see the clustering actually fire.

## Correlation measures mechanism, not validity

The spec proposes average pairwise return correlation as a **gate**: a theme whose members don't
move together isn't a real theme. Measured against the 11 themes from a real 93-ticker run, that
turns out to be the wrong conclusion to draw from the number. Only 3 of 11 cleared 0.4 — and the
failures were not bad themes:

| 10-day avg corr  | Themes                                              | Mechanism                               |
| ---------------- | --------------------------------------------------- | --------------------------------------- |
| 0.71 – 0.76      | AI Data-Center, Cybersecurity, Optical Ban          | one external driver hitting all members |
| 0.15 – 0.39      | Enterprise Software, Oncology Testing, Rare-Disease | shared category, own earnings/readouts  |
| ≈0.00 / negative | **Announced Takeout Bids (−0.03)**, IT Services     | purely idiosyncratic events             |

Announced Takeout Bids is the clarifying case. A stock with an agreed cash bid decouples from
everything and pins to the offer price — its correlation _should_ be ~0. The narrative is entirely
real and the co-movement is genuinely absent, at the same time. Gating on 0.4 would have dissolved
8 valid themes for the wrong reason.

So correlation is measured and reported, not enforced. What it actually tells you is **what kind of
object a theme is**, which is what `classify_coherence` encodes and what the ranking stage consumes:

- `shared-driver` (≥ 0.55) — members compete for the same flow, so ranking them is a real horse race.
- `mixed` (0.20 – 0.55) — shared category with name-specific dispersion.
- `idiosyncratic` (≤ 0.20) — members are **not substitutes**; the ranking prompt is explicitly told
  not to manufacture a horse race, and to rank on per-name durability instead.

`--use-correlation` still exists for callers who want the strict gate, and still dissolves themes
with missing price data rather than passing them. The 0.4 threshold remains the spec's uncalibrated
starting guess; the 0.55/0.20 coherence bands are read off the table above and are equally
provisional.

## Not built (out of scope for this pass)

- **v3**: scheduled runs, Obsidian note output, a second LLM call for a paragraph-length narrative.
- **News source swap**: Polygon.io/Benzinga integration — the seam exists (`fetch_news`), the client
  doesn't.
