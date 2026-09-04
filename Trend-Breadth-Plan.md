# Trend Breadth Plan — Stacked-MA Count, replacing Leader Breadth

Handoff document. Specifies the algorithm and the architectural decisions for the second market-breadth metric in Blue Star: the daily count of universe stocks in a short-term uptrend (`close > EMA21`, `EMA9 > EMA21 > SMA50`), its ratio to the evaluable universe, and a binary GOOD/BAD state from the SMA5 vs SMA20 of that ratio. It **replaces** the weekly leader-count breadth gauge shipped in the `leader-scan` module. Implementation details (file layout, DTO shapes, SQL, chart config) are left to the implementing agent, who must follow `CLAUDE.md`, `apps/backend/CLAUDE.md` and `apps/frontend/CLAUDE.md`.

Companion documents: `Market-Breadth-Plan.md` (NH/NL slice, already shipped — this plan extends that module), `Breadth-Strategies.md` (why this metric over the alternatives).

---

## 1. Goal and context

The current "Leader Breadth" gauge trends the weekly leader-scan `leader_count` against its 20-week MA. It is a poor gauge for two reasons:

1. `leader_count` comes from a **relative** rank (`rs_score = max(rank_1m, rank_3m, rank_6m) ≥ 0.98`), so it is always ~2–4% of the scanned universe regardless of market state. In production it reads 28/774 and 33/798 — it tracks universe size, not leadership.
2. It is weekly, cannot be backfilled (the scanner only sees today), and in practice the cron has produced two runs since April.

The replacement counts stocks whose moving averages are stacked bullishly. That is an **absolute** per-stock condition, so the ratio to the universe is meaningful on its own, it is daily, and it is a pure query over candles already persisted for the NH/NL indicator — so it has full history the day it ships.

Out of scope: the composite GO/NO-GO gate endpoint, the Nasdaq EMA10/20 condition, % above SMA50, any backtest. This plan delivers the metric, its state, and the Dashboard card.

---

## 2. Decisions already made (do not relitigate)

| Decision             | Choice                                                                                                                                                                                                                                                             | Rationale                                                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Universe             | **Same as NH/NL**: the `market-breadth` universe (TradingView, RS-rating filter, ~3,400 symbols), with the same per-day persisted membership.                                                                                                                      | One universe for every gate input; survivorship handled once.                                                                                                                                      |
| Evaluable set        | **Same 252-prior-session rule as NH/NL.** A symbol counts toward `universe_size` and toward the stacked count only if it has ≥ 252 prior sessions.                                                                                                                 | The SMAs/EMAs only need ~50 sessions, but sharing the evaluable set keeps `universe_size` a single denominator for every metric in the row.                                                        |
| Per-stock condition  | `close(D) > EMA21(D)`, `EMA9(D) > EMA21(D)`, `EMA21(D) > SMA50(D)` — all strict.                                                                                                                                                                                   | Stacked MAs = short-term uptrend. `close > EMA21` (not `close > EMA9`) rejects stocks that have already rolled over without flipping on every intraday wobble.                                     |
| Aggregate stored     | **`stacked_count` only**, as a new column on `market_breadth_daily_aggregates`. The ratio and the SMA5/SMA20 state are **derived at read time**.                                                                                                                   | Same pattern as the NH/NL ratio: thresholds and smoothing stay free to change without a migration; both the level view and the crossover view remain available for the backtest.                   |
| Ratio                | `stacked_ratio(D) = stacked_count(D) / universe_size(D)`.                                                                                                                                                                                                          | Universe size drifts as names cross the $300M / $5M filters; the ratio removes that drift term. Membership is already persisted per day.                                                           |
| State                | `SMA5(stacked_ratio) ≥ SMA20(stacked_ratio)` → **GOOD**, else **BAD**. Binary. No level threshold.                                                                                                                                                                 | No arbitrary percentage to pick; self-adapting; turns GOOD early in a new uptrend when fresh breakouts work best. Level information is deliberately given up — the other gate conditions carry it. |
| Computation location | **Backend**, in the existing `market-breadth` module, inside the same daily 5-session recompute and the same backfill as NH/NL.                                                                                                                                    | One cron, one candle fetch, one aggregate row per session.                                                                                                                                         |
| Replacement          | The `leader-scan` **breadth gauge** is removed: `classifyBreadth`, `GET /leader-scan/breadth`, the frontend `leader-breadth` module and the Dashboard card. The leader **scan itself** (weekly list of names, `GET /leader-scan/latest`, `/symbol/:symbol`) stays. | The scan is still useful for _which_ names lead; only its _count_ was being misused as a breadth signal.                                                                                           |

---

## 3. Algorithm specification

### 3.1 Inputs per symbol

Daily split-adjusted candles as already fetched for NH/NL, extended with **`close`** (the current `BreadthCandle` projection carries only `high`/`low`).

### 3.2 Moving averages on day D

Computed over the symbol's own session series, oldest to newest:

- `SMA50(D)` = arithmetic mean of `close(D−49 … D)`.
- `EMA_n(D)` = standard exponential average with multiplier `k = 2 / (n + 1)`: `EMA_n(D) = close(D) · k + EMA_n(D−1) · (1 − k)`, **seeded** with the SMA of the first `n` closes of the series and then recursed over every subsequent close.

With ≥ 252 prior sessions guaranteed by the evaluable rule, the seed's influence on `EMA9`/`EMA21` at D is negligible (< 10⁻¹⁰), so backfill and daily runs produce identical values for the same date. Do not seed from an arbitrary later point.

### 3.3 Stacked condition on day D

For an evaluable symbol:

```
stacked(D) ⇔ close(D) > EMA21(D) AND EMA9(D) > EMA21(D) AND EMA21(D) > SMA50(D)
```

All comparisons strict. Equality is not an uptrend. The close is compared to EMA21, not EMA9: a wobble below EMA9 while still above EMA21 stays stacked.

### 3.4 Daily aggregate

The existing row gains one field:

| Field           | Definition                                    |
| --------------- | --------------------------------------------- |
| `stacked_count` | Number of evaluable symbols with `stacked(D)` |

`universe_size` keeps its NH/NL meaning (number of evaluable symbols on D) and is shared. `missing_symbols`, `partial`, `backfilled` are unchanged and apply to the whole row.

### 3.5 Derived at read time

Over the sessions oldest-to-newest:

- `stacked_ratio(D) = stacked_count(D) / universe_size(D)`; null when `stacked_count` is null (rows written before this column existed and not yet recomputed) or `universe_size` is 0.
- `sma5(D)`, `sma20(D)` = arithmetic means of the last 5 / 20 non-null ratios ending at D (partial window near the start of the series, same convention as `trailingAverageRatios`).
- `trend_state(D)` = `GOOD` if `sma5(D) ≥ sma20(D)`, else `BAD`; null if fewer than 2 ratios are available.
- The latest session's `trend_state` is the headline value.

The read endpoint must fetch enough history that `sma20` at the oldest _displayed_ session is a full 20-sample window: request `limit + 19` aggregates, compute, then return the last `limit` (same trick as the leader-breadth MA line: fetch beyond the display window).

### 3.6 Recompute, idempotency, backfill

Unchanged from `Market-Breadth-Plan.md` §3.5–3.6: last 5 sessions daily, upsert by date, ≥ 60 sessions on backfill using today's universe. The new column is written by the same code path.

**Migration of existing rows:** the new column is nullable. Existing NH/NL rows have `stacked_count = NULL` until the backfill is re-run once after deploy. The read model treats null as "no data" (see §3.5); the UI shows a gap, not a zero. The 20-sample requirement means the state is available from the 20th backfilled session onward — with a 60-session backfill that leaves 40 sessions of state on day one.

---

## 4. Runtime behaviour

- **Schedule:** the existing `market-breadth` daily cron. No new job.
- **Sequence:** unchanged — fetch universe → persist membership → ensure candles → compute last 5 sessions → upsert aggregates. The per-session computation now evaluates both NH/NL and `stacked` from the same candle arrays in one pass.
- **API:** the existing `GET /market-breadth` response gains, per session, `stackedCount`, `stackedRatio`, `stackedRatioSma5`, `stackedRatioSma20`, `trendState`; and a top-level `trend` object with the latest `state`, `sma5`, `sma20`, `sampleSize`. Field names are the implementer's choice; the shape must let the UI draw the ratio line, both SMAs, and the state without recomputing.
- **Removal:** `GET /leader-scan/breadth` is deleted along with `QueryLeaderBreadthUseCase`, `classifyBreadth` and its spec, `BreadthRegime` VO, and `LeaderScanRepository.getRecentCompletedRuns`. The `leader_scan_runs` table and columns stay (the scan writes them).

---

## 5. Frontend

- Dashboard card **"Trend Breadth"** takes the slot of the removed "Leader Breadth" card, beside "New Highs / New Lows".
- Header: latest `stacked_count` / `universe_size`, the ratio as a percentage, and a GOOD/BAD badge (green/red). No YELLOW — the state is binary by design.
- Chart: last 50 sessions, line chart of `stacked_ratio` (%) with the SMA5 and SMA20 overlaid as two distinguishable lines; optional light shading of the GOOD spans. Hover popover with date, count, ratio, both SMAs — reuse the interaction pattern of the existing breadth chart.
- Sessions with a null ratio (pre-column rows) render as gaps.
- Delete `apps/frontend/src/leader-breadth/` entirely.

---

## 6. Phases

Each phase ends with the quality gates green (`tsc`, lint, tests) and is independently committable.

| Phase | Deliverable                                                                                                                                                           | Acceptance                                                                                                                                                                                                                |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Pure domain service for §3.2–3.3 (SMA, seeded EMA, `stacked`), plus `close` on the candle projection                                                                  | Unit tests: EMA seed/recursion against hand-computed values; strict inequalities (equal values → not stacked); symbol below 252 sessions not evaluable; both NH/NL and stacked computed from the same candles in one pass |
| 2     | Migration adding nullable `stacked_count`; entity, repository, analysis service write it; daily run and backfill populate it                                          | Integration test round-trips the column; existing NH/NL tests untouched and green                                                                                                                                         |
| 3     | Read model §3.5: pure service for ratio / SMA5 / SMA20 / state with partial windows and null handling; use case fetches `limit + 19` and trims; response DTO extended | Unit tests: partial windows at series start; null rows produce null ratio and are skipped by the SMAs; state flips exactly at `sma5 == sma20` (GOOD); latest state equals the last session's state                        |
| 4     | Dashboard "Trend Breadth" card                                                                                                                                        | Card renders ratio + two SMAs + badge from the endpoint; gaps for null sessions; verified in the running app                                                                                                              |
| 5     | Remove the leader-breadth gauge: backend endpoint/use case/service/VO/repository method and specs, frontend `leader-breadth/` module, Dashboard import                | `tsc`/lint/tests green; `GET /leader-scan/latest` and `/symbol/:symbol` still work                                                                                                                                        |
| 6     | Deploy, then run `npm run market-breadth:backfill --workspace=backend` once against production                                                                        | Endpoint returns ≥ 40 sessions with a non-null `trendState`                                                                                                                                                               |

---

## 7. Open points for the implementing agent

Implementation choices, intentionally not decided here:

- Whether the stacked computation lives in `nh-nl-computation.service.ts` (renamed to a generic per-symbol evaluator) or in a sibling service that shares the candle loop.
- Exact response field names.
- Whether to shade GOOD spans on the chart or rely on the badge alone.
- Whether to also clean up the two orphan production tables `leader_breadth_snapshots` and `market_regime` (created 2026-06-03 by the unmerged branch `feat/market-regime-leader-breadth`, both empty, no migration files on `main`). Recommended: drop the branch and add a migration on `main` that drops both tables, but this is separable from the plan.

Anything in §2 or §3 is not an open point.
