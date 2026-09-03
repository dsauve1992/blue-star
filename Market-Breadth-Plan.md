# Market Breadth Plan — 52-Week New Highs / New Lows

Handoff document. Specifies the algorithm and the architectural decisions for the first market-breadth indicator in Blue Star: a daily count of 52-week new highs and new lows across the US stock universe, shown as a 50-session chart on the Dashboard. Implementation details (file layout, DTO shapes, SQL, chart config) are left to the implementing agent, who must follow `CLAUDE.md`, `apps/backend/CLAUDE.md` and `apps/frontend/CLAUDE.md`.

---

## 1. Goal and context

The user's entry decision needs a deterministic market gate ("should I enter now given a breakout?"). SPY EMA alignment alone lets through narrow, mega-cap-led rallies in which breakouts fail. The gate will eventually combine three conditions — index trend, participation (new highs vs new lows), and breadth (% above SMA50) — all computed over the same stock universe.

This plan delivers the **participation** input only: the daily 52-week new-high and new-low counts, persisted as history, and a Dashboard chart of the last 50 sessions. It also lays the data foundation (universe + daily candles in the database) that the later conditions will reuse without adding any new data source.

Out of scope for this plan: the gate itself, the ratio threshold, % above SMA50, the equal-weight universe line, any backtest.

---

## 2. Decisions already made (do not relitigate)

| Decision                        | Choice                                                                                                                                                                                       | Rationale                                                                                                                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Universe source                 | **TradingView scanner**, same filter as the existing RS-rating screener: US primary-listed common stock, close > $1, market cap > $300M, 30-day average traded value > $5M (~3,400 symbols). | Represents the market the user trades; excludes micro-caps and illiquid names that dominate raw exchange NH/NL counts. Reuses a filter already trusted in the repo.                                 |
| Universe fetch                  | **Python CLI** (new `apps/` folder, modelled on `apps/leader-scan/`), emitting the symbol list as JSON on stdout, spawned by the backend.                                                    | All TradingView access in this repo lives in Python CLIs; keep the pattern.                                                                                                                         |
| Price history source            | **Yahoo Finance daily candles**, fetched by the backend through the existing `market-data` module.                                                                                           | One measurement method for both backfill and daily updates — no seam in the series. Yahoo is already the candle provider in the backend.                                                            |
| Candle persistence              | Daily candles for every universe symbol are **stored in Postgres** (the existing `market_data_cache` table is the natural home; the `market-data` module owns it).                           | Once the whole universe's candles are in the database, every future breadth metric (% above SMA50, equal-weight line, backtests) is a query, not a new integration. ~1M rows is trivial for the Pi. |
| Universe membership persistence | The set of symbols evaluated each day **is persisted** (date, symbol).                                                                                                                       | Prevents survivorship bias in every future metric; ~3,400 rows/day is cheap.                                                                                                                        |
| Module placement                | New backend module **`market-breadth`**. It depends on `market-data` (read/fetch candles via its public service) and spawns the universe CLI. `market-health` (SPY EMAs) is left untouched.  | `market-health` is a single-entity SPY module; breadth will grow to several metrics and the gate. Separate bounded context.                                                                         |
| Computation location            | Breadth counts are computed **in the backend**, per symbol, from persisted candles. Python only supplies the universe.                                                                       | Avoids pushing ~1M candles through stdout and keeps the algorithm testable in TypeScript next to its persistence.                                                                                   |
| Backfill                        | One-time, **operator-triggered command** (not an HTTP endpoint), running the exact same computation as the daily job over a longer window.                                                   | Same code path guarantees the backfilled history and the live history are comparable.                                                                                                               |
| Frontend placement              | New feature folder mirroring `apps/frontend/src/leader-breadth/`; a card on the Dashboard next to the Leader Breadth card.                                                                   | Consistency with the existing breadth gauge.                                                                                                                                                        |

---

## 3. Algorithm specification

### 3.1 Universe

- Fetched once per daily run from the TradingView scanner with the filter above. Symbols only; no other columns are needed.
- The universe of day D is the universe fetched on day D. Membership is persisted per day.
- Symbols in the universe that Yahoo cannot serve are skipped and counted as misses (see §3.5).

### 3.2 Candle requirements

- Daily OHLC, **split-adjusted** (Yahoo's default). Dividend adjustment is not required. Without split adjustment a 10:1 split would register as a false new low.
- A symbol is **evaluable on day D** only if it has at least **252 prior sessions** of candles before D (its own session series, not calendar days). Symbols with less history (IPOs, recent listings) are excluded from that day's counts and from `universe_size`. This is deliberate: partial windows would make the count depend on listing age.

### 3.3 New high / new low on day D

For an evaluable symbol with candles indexed by session:

- `new_high(D)` ⇔ `high(D) ≥ max(high(D−252 … D−1))`
- `new_low(D)` ⇔ `low(D) ≤ min(low(D−252 … D−1))`

The trailing window **excludes D itself** — otherwise every day would trivially equal its own extreme. Equality counts (a retest of the exact 52-week high is a new high). A symbol can, in theory, be both on the same day (huge range bar); count it in both.

### 3.4 Daily aggregate

Per session date D, persist:

| Field             | Definition                                                          |
| ----------------- | ------------------------------------------------------------------- |
| `date`            | Session date                                                        |
| `universe_size`   | Number of evaluable symbols on D                                    |
| `new_highs`       | Count of symbols with `new_high(D)`                                 |
| `new_lows`        | Count of symbols with `new_low(D)`                                  |
| `missing_symbols` | Universe symbols for which candles could not be fetched on this run |

The ratio `new_highs / (new_highs + new_lows)` is **derived at read time**, not stored (null when both counts are zero). It is the future gate input; storing counts keeps the thresholds free to change.

### 3.5 Recompute window and idempotency

- The daily job recomputes the **last 5 sessions**, upserting by date. This absorbs late or corrected Yahoo data and makes reruns safe.
- A run with **more than 5% of the universe missing** is marked partial (the aggregate is still written, with `missing_symbols` populated). The API exposes this so the UI can flag the bar later; no UI treatment is required in this plan.
- A run on a day with no new session (market holiday, weekend) is a no-op, not an error.

### 3.6 Backfill

- Produces the aggregate for at least the **last 60 sessions** (the chart shows 50). This requires candles from roughly 15 months back (252 + 60 sessions plus margin).
- Uses today's universe for every past day (survivorship bias is accepted for this one-time backfill and documented in the aggregate as such — e.g. a boolean `backfilled`). From the first live run onward, each day's own universe is used.

---

## 4. Runtime behaviour

- **Schedule:** weekdays, after the US close, once Yahoo's daily bar is final (evening, America/Toronto — same convention as the other crons). Uses the existing cron-notification service for start/success/error like `leader-scan`.
- **Sequence:** fetch universe → persist membership → ensure candles for every symbol cover the required window (fetch only what is missing) → compute last 5 sessions → upsert aggregates.
- **Rate limiting:** Yahoo requests are bounded in concurrency and retried once; a symbol that still fails is a miss, never a job failure. Expected daily runtime is in the range of minutes, which is acceptable for an evening job.
- **API:** one read endpoint returning the last N sessions of aggregates (default 50), including per-day counts, `universe_size`, the derived ratio, and the partial/backfilled flags.

---

## 5. Frontend

- Dashboard card **"New Highs / New Lows"**, placed beside the Leader Breadth card.
- Chart: last 50 sessions, **mirrored histogram** — new highs as positive bars, new lows as negative bars — using lightweight-charts (see the `lightweight-charts` skill for the project's chart conventions). One glance answers "are lows expanding under the surface?".
- Header shows the latest session's counts and the derived ratio.
- No thresholds, colours-by-state, or gate logic in this iteration. The chart is descriptive only.

---

## 6. Phases

Each phase ends with the quality gates green (`tsc`, lint, tests) and is independently committable.

| Phase | Deliverable                                                                                                                                                              | Acceptance                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Universe CLI (`apps/`), with tests for the filter payload and output shape                                                                                               | Running it prints ~3,400 symbols as JSON                                                                                                           |
| 2     | `market-breadth` backend module: membership + aggregate persistence (migrations), candle acquisition through `market-data`, NH/NL computation, daily cron, read endpoint | Unit tests cover §3.2–3.5 (window exclusion, equality, <252 sessions excluded, both-on-same-day, 5-session recompute idempotent, partial-run flag) |
| 3     | Backfill command                                                                                                                                                         | After one run, the endpoint returns ≥ 60 sessions flagged `backfilled`                                                                             |
| 4     | Dashboard card                                                                                                                                                           | Card renders the 50-session mirrored histogram from the endpoint                                                                                   |

---

## 7. Open points for the implementing agent

These are implementation choices, intentionally not decided here:

- Whether the universe CLI is a new app or an additional mode of `apps/leader-scan` (a new app is the default expectation).
- Concurrency limit and retry policy for Yahoo fetches.
- Exact cron time.
- How the backfill command is exposed (npm script, Nest CLI command, or similar).

Anything in §2 or §3 is not an open point.
