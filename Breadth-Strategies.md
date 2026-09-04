# Breadth Strategies — Options Enumerated

Summary of the ways we considered measuring market breadth for the entry gate ("should I enter now given a breakout?"), what was chosen, what was rejected, and why. Companion to `Market-Breadth-Plan.md` (NH/NL slice, shipped) and `Trend-Breadth-Plan.md` (stacked-MA count replacing leader breadth).

Status as of 2026-09-03.

---

## 1. The problem

SPY (or Nasdaq) EMA alignment alone lets the user get exposed in narrow, mega-cap-led rallies in which breakouts fail. The gate needs a participation measure that removes interpretation — a plain formula over a fixed universe — accepting that it will miss some opportunities.

Guiding constraints, all deliberate:

- Formula-only inputs, no discretionary reading.
- Computed over **the universe the user trades** (RS-rating screener filter, ~3,400 names), not raw exchange counts.
- Daily series persisted so thresholds can be backtested later.
- Prefer few, simple conditions over a rich composite.

---

## 2. Strategies considered

| #   | Strategy                                          | Formula                                                                  | Cadence | Status                                                                  |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------ | ------- | ----------------------------------------------------------------------- |
| A   | Index trend (SPY)                                 | SPY close > EMA9 > EMA21                                                 | Daily   | **Shipped** (`market-health`) — status bar only                         |
| B   | Index trend (Nasdaq Composite)                    | Nasdaq close > EMA10 > EMA20                                             | Daily   | **Chosen for gate**, not yet built                                      |
| C   | Leader breadth (weekly leader-scan)               | `leader_count` vs its trailing 20-week MA + direction → GREEN/YELLOW/RED | Weekly  | **Shipped, to be removed** — relative rank makes the count ~constant; see N |
| D   | Leader breadth (daily RS rating ≥ 90 count)       | Count of RS ≥ 90 names vs 20-DMA (Martin Luk's gauge)                    | Daily   | Design only — superseded by C; requires RS cron weekly→daily            |
| E   | 52-week new highs / new lows (participation)      | `NH / (NH + NL)`, 5-session average; ≥ 0.6 GREEN, < 0.4 RED, else YELLOW | Daily   | **Shipped** (`market-breadth`)                                          |
| F   | % of universe above SMA50                         | `count(close > SMA50) / universe_size > 0.5`                             | Daily   | Superseded by N (strict subset, N discriminates narrow rallies better)   |
| G   | Minervini trend-template leader count             | Count of names passing the 8-point template                              | Daily   | Rejected                                                                |
| H   | Setup count with base detection                   | Count of names in a valid consolidation                                  | Daily   | Rejected                                                                |
| I   | "Fresh reclaim" filter                            | Index reclaimed EMA within the last 8 weeks                              | Daily   | Rejected                                                                |
| J   | Distribution-day count (O'Neil)                   | Count of down days on higher volume over 25 sessions                     | Daily   | Rejected                                                                |
| K   | Follow-through rate on breakouts                  | % of recent breakouts that held N days                                   | Daily   | Rejected                                                                |
| L   | Raw exchange NH/NL counts                         | Exchange-published counts (all listings)                                 | Daily   | Rejected                                                                |
| M   | Composite regime (`RegimeState` / `ExposureBand`) | worse-of(SPY trend, leader breadth) → sizing band                        | Daily   | Design only                                                             |
| N   | Trend breadth (stacked-MA count)                  | `count(close > EMA21 AND EMA9 > EMA21 AND EMA21 > SMA50) / universe_size`; SMA5 ≥ SMA20 → GOOD else BAD | Daily | **Chosen for gate**, planned in `Trend-Breadth-Plan.md`               |

---

## 3. The chosen gate

Three conditions, all must hold → **GO**, otherwise **NO-GO**:

1. **Index trend (B):** Nasdaq Composite close > EMA10 > EMA20.
2. **Participation (E):** 52-week `NH / (NH + NL)` averaged over 5 sessions > 0.6.
3. **Trend breadth (N):** ratio of stocks with `close > EMA21 AND EMA9 > EMA21 AND EMA21 > SMA50`; `SMA5(ratio) ≥ SMA20(ratio)`.

Thresholds are conventional starting points to be backtested, not truth. No pilot tier, no RS rating, no base detection.

### Why these three

- Each is a plain formula over data we already persist (or will, from the same candle store).
- Together they cover the three failure modes seen in practice: index not trending (1), lows expanding under the surface (2), and a narrow rally where the share of stocks in a short-term uptrend is shrinking (3).
- Condition 3 is a direction test, not a level test — it turns GO early in a new uptrend and gives up level information deliberately; conditions 1–2 carry the level.
- Two of the three are computed over the user's universe, so a mega-cap-led index rise with weak participation reads as NO-GO.

---

## 4. What shipped, in detail

### 4.1 Leader breadth (C) — `leader-scan` module, weekly

- Input: `leader_count` / `universe_size` per completed Friday leader-scan run (top-2% on 1M/3M/6M performance rank, ~800-name ADR ≥ 3% universe).
- `classifyBreadth()` in `leader-breadth.service.ts`: latest count vs trailing 20-week MA, plus direction vs prior run.
  - GREEN: count ≥ MA and rising.
  - RED: count < MA and falling.
  - YELLOW: everything else (above-but-falling, below-but-rising, flat).
- `provisional` until ≥ 8 runs.
- Per-point trailing MA is exposed on the series (fetches 2× lookback so the MA line has a value at every plotted point). Dashboard card plots count + dashed MA line with hover popover.
- **Being removed** (see `Trend-Breadth-Plan.md`). Production state on 2026-09-03: two completed runs (2026-05-01: 28/774, 2026-05-29: 33/798), none since, gauge still `provisional`. The count is ~3–4% of the universe by construction because `rs_score` is a percentile rank — it measures universe size, not leadership. The weekly leader *list* stays; only the breadth gauge goes.

### 4.2 NH/NL participation (E) — `market-breadth` module, daily

- Universe: TradingView scanner, RS-rating filter (US primary, close > $1, mcap > $300M, 30-day traded value > $5M). Membership persisted per day to avoid survivorship bias.
- Candles: Yahoo daily, split-adjusted, persisted for the whole universe through `market-data`.
- `evaluateSymbolOnDate()` in `nh-nl-computation.service.ts`:
  - Evaluable only with ≥ 252 prior sessions (IPOs excluded rather than given partial windows).
  - `new_high(D) ⇔ high(D) ≥ max(high(D−252…D−1))`; `new_low` symmetric on lows. Window excludes D; equality counts (retest = new high).
- `aggregateDay()`: counts NH, NL, evaluable universe size; run flagged `partial` when > 5% of universe missing.
- Ratio `NH / (NH + NL)` derived at read time (null when both zero) so thresholds stay free to change.
- `gaugeParticipation()` in `participation-regime.service.ts`: 5-session average of the ratio → GREEN ≥ 0.6, RED < 0.4, else YELLOW. `trailingAverageRatios()` gives the per-session average line.
- Daily recompute of the last 5 sessions, upsert by date; backfill uses today's universe (flagged `backfilled`).
- Dashboard: 50-session mirrored histogram (NH up, NL down) with 5-day average line and regime badge.

### 4.3 SPY trend (A) — `market-health` module

- SPY EMA9 / EMA21 status, rendered as a 1px top-of-page bar. Predates the gate work; left untouched. The gate uses Nasdaq Composite with 10/20 instead (B).

---

## 5. Why the rejected ones were rejected

| Strategy                                | Reason                                                                                                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **G** Minervini template count          | Eight conditions per name; too many moving parts, hard to attribute a NO-GO to a cause. Also lags — names drop out of the template well after breadth has turned. |
| **H** Setup count with base detection   | Depends on a discretionary-ish base detector; false negatives when bases are valid but non-standard. Too complicated for a gate.                                  |
| **I** "Fresh reclaim within 8 weeks"    | Adds a time-since-event dimension that needs its own tuning; produces false negatives late in a healthy uptrend.                                                  |
| **J** Distribution-day count            | Interpretive (which days count, when they expire); the user wanted no counting rules with judgment calls.                                                         |
| **K** Follow-through rate               | Structurally late — you learn breakouts are failing only after enough of them have failed. Needs breakout-outcome tracking that doesn't exist yet.                |
| **L** Raw exchange NH/NL                | Dominated by micro-caps, illiquid names, and non-common listings; not the market the user trades.                                                                 |
| **D** Daily RS ≥ 90 count               | Same flaw as C: a percentile-rank threshold yields a near-constant share of the universe, so the count cannot express market state. Also needs the RS cron weekly → daily. |
| **C** Weekly leader-scan count          | Relative rank → near-constant count (28/774, 33/798 in prod); weekly; not backfillable; cron produced two runs in four months. Replaced by N.                          |
| **F** % above SMA50                     | Not wrong, but a strict superset of N and slow to fall — stays high for weeks after short-term trends roll over. N chosen instead; F can still be derived from the same candles for the backtest. |
| **M** Composite regime + exposure bands | Deferred, not rejected. Adds sizing guidance on top of the gate; premature until the three gate inputs exist and have been backtested.                            |

---

## 6. Remaining work

1. **N — Trend breadth**: `Trend-Breadth-Plan.md`. Adds `stacked_count` to the daily aggregate, derives ratio / SMA5 / SMA20 / GOOD-BAD at read time, replaces the Leader Breadth card, removes the leader-scan breadth gauge.
2. **B — Nasdaq Composite EMA10/20**: single-instrument daily fetch; decide whether it lives in `market-health` (rename/generalise) or `market-breadth`.
3. **Gate endpoint + Dashboard card**: `GO` / `NO-GO` from the three inputs, each condition shown with its current value so a NO-GO is attributable.
4. **Backtest** the NH/NL 0.6 threshold and the SMA5/SMA20 rule against breakout outcomes; check whether N needs a level floor to filter bear-market bounces.
5. Clean up the orphan `leader_breadth_snapshots` / `market_regime` tables and the unmerged `feat/market-regime-leader-breadth` branch.
6. Optionally fold **M** in later as a sizing layer.
